const express = require('express');
const { Op, fn, col, literal } = require('sequelize');
const { sequelize, WorkOrder, Customer, Technician, Construction, CallbackRecord, User, Settings } = require('../models');
const { auth } = require('../middleware/auth');
const { escapeLike, validatePhone, validateLength } = require('../utils/sanitize');

const router = express.Router();

// 回访阈值：从系统配置读取，默认100元
async function getCallbackFeeThreshold() {
  try {
    const setting = await Settings.findOne({ where: { category: 'callbackFeeThreshold' } });
    return setting?.values?.threshold || 100;
  } catch {
    return 100;
  }
}

// 获取工单列表
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, status, area, problemCategory, category, technicianId, keyword, customerId, customerPhone, overdue, awaitCallback, pendingDispatch } = req.query;

    const where = {};
    if (status) where.status = status;
    if (area) where.area = area;
    if (problemCategory || category) where.problem_category = problemCategory || category;

    // 按技师筛选：使用 include where 替代 N+1 查询
    const include = [
      { model: Customer, as: 'customer' },
      {
        model: Construction,
        as: 'construction',
        include: [{ model: Technician, as: 'technician' }]
      }
    ];

    if (technicianId) {
      include[1].where = { technician_id: technicianId };
      include[1].required = true; // INNER JOIN
    }

    if (customerId) where.customer_id = customerId;
    if (customerPhone) {
      const safePhone = escapeLike(customerPhone);
      where.customer_phone = { [Op.like]: `%${safePhone}%` };
    }
    if (keyword) {
      const safeKeyword = escapeLike(keyword);
      where[Op.or] = [
        { order_no: { [Op.like]: `%${safeKeyword}%` } },
        { customer_name: { [Op.like]: `%${safeKeyword}%` } },
        { customer_phone: { [Op.like]: `%${safeKeyword}%` } },
        { address: { [Op.like]: `%${safeKeyword}%` } }
      ];
    }

    // 超期筛选
    if (overdue === 'true') {
      const overdueThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
      Object.assign(where, {
        status: { [Op.in]: ['pending', 'dispatched'] },
        created_at: { [Op.lt]: overdueThreshold }
      });
    }

    // 待回访筛选：使用 include where 替代 N+1 查询
    if (awaitCallback === 'true') {
      const feeThreshold = await getCallbackFeeThreshold();
      // Add construction filter via include
      const constructionWhere = include[1].where || {};
      constructionWhere.total_fee = { [Op.gt]: feeThreshold };
      include[1].where = constructionWhere;
      include[1].required = true;
      where.status = 'completed';
    }

    // 待处理筛选
    if (pendingDispatch === 'true') {
      where.status = { [Op.in]: ['pending', 'dispatched'] };
    }

    const offset = (page - 1) * pageSize;

    const { count, rows } = await WorkOrder.findAndCountAll({
      where,
      include,
      order: [['created_at', 'DESC']],
      limit: parseInt(pageSize),
      offset,
      // When using include with required:true + where, count needs subQuery
      subQuery: false,
      distinct: true
    });

    // Status counts + overdue + awaitCallback — 3 queries merged into 1
    const feeThreshold = await getCallbackFeeThreshold();
    const overdueThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [statusCountsRaw, overdueCount, awaitCallbackCount] = await Promise.all([
      WorkOrder.findAll({
        attributes: ['status', [fn('COUNT', literal('*')), 'count']],
        group: ['status']
      }),
      WorkOrder.count({
        where: {
          status: { [Op.in]: ['pending', 'dispatched'] },
          created_at: { [Op.lt]: overdueThreshold }
        }
      }),
      WorkOrder.count({
        where: { status: 'completed' },
        include: [{
          model: Construction,
          as: 'construction',
          where: { total_fee: { [Op.gt]: feeThreshold } },
          attributes: []
        }]
      })
    ]);

    const statusCounts = {};
    const allStatuses = ['pending', 'dispatched', 'completed', 'callback', 'cancelled', 'consultation'];
    allStatuses.forEach(s => { statusCounts[s] = 0; });
    statusCountsRaw.forEach(r => {
      statusCounts[r.dataValues.status] = parseInt(r.dataValues.count);
    });

    // Format items for frontend
    const items = rows.map(order => {
      const o = order.toJSON();
      return {
        id: o.id,
        orderNo: o.order_no,
        status: o.status,
        customerId: o.customer_id,
        customerName: o.customer_name,
        customerPhone: o.customer_phone,
        area: o.area,
        address: o.address,
        sourceChannel: o.source_channel,
        problemCategory: o.problem_category,
        problemDescription: o.problem_description,
        receiverId: o.receiver_id,
        receiverName: o.receiver?.real_name,
        receivedAt: o.received_at,
        completedAt: o.completed_at,
        cancelReason: o.cancel_reason,
        receiverRemark: o.receiver_remark,
        createdAt: o.created_at,
        updatedAt: o.updated_at,
        technicianName: o.construction?.technician?.name || null,
        technicianPhone: o.construction?.technician?.phone || null,
        technicianId: o.construction?.technician_id || null,
        dispatchedAt: o.construction?.dispatched_at || null,
        startedAt: o.construction?.started_at || null,
        totalFee: o.construction?.total_fee || null,
        serviceFee: o.construction?.service_fee || null,
        receivedFee: o.construction?.received_fee || null,
        materialCost: o.construction?.material_cost || null,
        buildingManagerIncentive: o.construction?.building_manager_incentive || null,
        commissionRate: o.construction?.commission_rate || null,
        actualWork: o.construction?.actual_work || null,
        callbackRecord: o.callback || null
      };
    });

    res.json({
      items,
      total: count,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      statusCounts,
      overdueCount,
      awaitCallbackCount
    });
  } catch (error) {
    console.error('获取工单列表失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取统计数据
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [todayCount, pendingCount, pendingCallbackCount, totalRevenue] = await Promise.all([
      WorkOrder.count({ where: { created_at: { [Op.gte]: todayStart } } }),
      WorkOrder.count({ where: { status: 'pending' } }),
      WorkOrder.count({ where: { status: 'completed' } }),
      Construction.sum('service_fee')
    ]);

    res.json({
      todayCount,
      pendingCount,
      pendingCallbackCount,
      totalRevenue: totalRevenue || 0
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取工单详情
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await WorkOrder.findByPk(req.params.id, {
      include: [
        { model: Customer, as: 'customer' },
        {
          model: Construction,
          as: 'construction',
          include: [{ model: Technician, as: 'technician' }]
        },
        {
          model: CallbackRecord,
          as: 'callback',
          include: [{ model: User, as: 'callbackUser' }]
        },
        { model: User, as: 'receiver' }
      ]
    });

    if (!order) {
      return res.status(404).json({ error: '工单不存在' });
    }

    const o = order.toJSON();

    let callbackRecord = null;
    if (o.callback) {
      callbackRecord = {
        isSatisfied: o.callback.is_satisfied,
        satisfactionScore: o.callback.satisfaction_score,
        feeConsistent: o.callback.fee_consistent,
        callbackMethod: o.callback.callback_method,
        callbackByName: o.callback.callbackUser?.real_name || null,
        otherFeedback: o.callback.other_feedback,
        callbackAt: o.callback.callback_at
      };
    }

    const historyOrders = await WorkOrder.findAll({
      where: { customer_id: o.customer_id, id: { [Op.ne]: o.id } },
      include: [
        { model: Construction, as: 'construction', include: [{ model: Technician, as: 'technician' }] },
        { model: CallbackRecord, as: 'callback' }
      ],
      order: [['created_at', 'DESC']],
      limit: 10
    });

    const historyFormatted = historyOrders.map(ho => {
      const h = ho.toJSON();
      return {
        id: h.id,
        orderNo: h.order_no,
        status: h.status,
        problemCategory: h.problem_category,
        completedAt: h.completed_at,
        technicianName: h.construction?.technician?.name || null,
        satisfactionScore: h.callback?.satisfaction_score || null
      };
    });

    res.json({
      id: o.id,
      orderNo: o.order_no,
      status: o.status,
      customerId: o.customer_id,
      customerName: o.customer_name,
      customerPhone: o.customer_phone,
      area: o.area,
      address: o.address,
      sourceChannel: o.source_channel,
      problemCategory: o.problem_category,
      problemDescription: o.problem_description,
      receiverId: o.receiver_id,
      receiverName: o.receiver?.real_name,
      receivedAt: o.received_at,
      completedAt: o.completed_at,
      cancelReason: o.cancel_reason,
      receiverRemark: o.receiver_remark,
      createdAt: o.created_at,
      updatedAt: o.updated_at,
      technicianId: o.construction?.technician_id || null,
      technicianName: o.construction?.technician?.name || null,
      technicianPhone: o.construction?.technician?.phone || null,
      dispatchedAt: o.construction?.dispatched_at || null,
      startedAt: o.construction?.started_at || null,
      totalFee: o.construction?.total_fee || null,
      serviceFee: o.construction?.service_fee || null,
      receivedFee: o.construction?.received_fee || null,
      materialCost: o.construction?.material_cost || null,
      buildingManagerIncentive: o.construction?.building_manager_incentive || null,
      commissionRate: o.construction?.commission_rate || null,
      actualWork: o.construction?.actual_work || null,
      callbackRecord,
      customerLevel: o.customer?.level || null,
      customerTags: o.customer?.tags || [],
      historyOrders: historyFormatted
    });
  } catch (error) {
    console.error('获取工单详情失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 创建工单
router.post('/', auth, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      customerId,
      customerName,
      customerPhone,
      area,
      address,
      sourceChannel,
      problemCategory,
      problemDescription,
      receiverRemark
    } = req.body;

    // Input validation
    if (!problemCategory) {
      await transaction.rollback();
      return res.status(400).json({ error: '问题分类不能为空' });
    }
    if (customerPhone) {
      const phoneCheck = validatePhone(customerPhone);
      if (!phoneCheck.valid) {
        await transaction.rollback();
        return res.status(400).json({ error: phoneCheck.error });
      }
    }

    // Check if customer exists
    let customer = await Customer.findByPk(customerId, { transaction });
    if (!customer && customerPhone) {
      customer = await Customer.findOne({ where: { phone: customerPhone }, transaction });
    }

    if (!customer) {
      customer = await Customer.create({
        name: customerName,
        phone: customerPhone,
        area,
        address,
        source_channel: sourceChannel
      }, { transaction });
    }

    // Generate order number — 6-digit random for better concurrency safety
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const timePart = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0') + String(now.getSeconds()).padStart(2, '0');
    const randomPart = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
    const orderNo = `${datePart}${timePart}${randomPart}`;

    const status = req.body.status || 'pending';

    const order = await WorkOrder.create({
      order_no: orderNo,
      status,
      customer_id: customer.id,
      customer_name: customerName || customer.name,
      customer_phone: customerPhone || customer.phone,
      area: area || customer.area,
      address: address || customer.address,
      source_channel: sourceChannel,
      problem_category: problemCategory,
      problem_description: problemDescription,
      receiver_id: req.user.id,
      received_at: new Date(),
      receiver_remark: receiverRemark
    }, { transaction });

    await transaction.commit();
    res.status(201).json(order);
  } catch (error) {
    await transaction.rollback();
    console.error('创建工单失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新工单基本信息
router.patch('/:id', auth, async (req, res) => {
  try {
    const order = await WorkOrder.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ error: '工单不存在' });
    }

    const allowedFields = ['customerName', 'customerPhone', 'area', 'address', 'sourceChannel', 'problemCategory', 'problemDescription', 'receiverRemark'];
    const fieldMap = {
      customerName: 'customer_name',
      customerPhone: 'customer_phone',
      sourceChannel: 'source_channel',
      problemCategory: 'problem_category',
      problemDescription: 'problem_description',
      receiverRemark: 'receiver_remark'
    };

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        const dbField = fieldMap[field] || field;
        order[dbField] = req.body[field];
      }
    });

    await order.save();
    res.json({ message: '工单信息更新成功' });
  } catch (error) {
    console.error('更新工单信息失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 派单 — 统一路由，/dispatch 重定向到 /assign
router.post('/:id/assign', auth, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { technicianId, remark, dispatchRemark } = req.body;
    if (!technicianId) {
      await transaction.rollback();
      return res.status(400).json({ error: '请选择师傅' });
    }

    const order = await WorkOrder.findByPk(req.params.id, { transaction });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ error: '工单不存在' });
    }

    if (order.status !== 'pending') {
      await transaction.rollback();
      return res.status(400).json({ error: '当前状态不允许派单' });
    }

    const technician = await Technician.findByPk(technicianId, { transaction });
    if (!technician) {
      await transaction.rollback();
      return res.status(404).json({ error: '师傅不存在' });
    }

    order.status = 'dispatched';
    await order.save({ transaction });

    await Construction.create({
      order_id: order.id,
      technician_id: technicianId,
      dispatch_remark: remark || dispatchRemark,
      dispatched_at: new Date(),
      commission_rate: technician.commission_rate
    }, { transaction });

    await transaction.commit();
    res.json({ message: '派单成功' });
  } catch (error) {
    await transaction.rollback();
    console.error('派单失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// /dispatch 保留做兼容，内部转发到 assign 逻辑
router.post('/:id/dispatch', auth, async (req, res) => {
  // Normalize field name: dispatchRemark → remark
  req.body.remark = req.body.remark || req.body.dispatchRemark;
  // Delegate to the same logic as /assign
  try {
    const transaction = await sequelize.transaction();
    const { technicianId, remark, dispatchRemark } = req.body;
    if (!technicianId) {
      await transaction.rollback();
      return res.status(400).json({ error: '请选择师傅' });
    }

    const order = await WorkOrder.findByPk(req.params.id, { transaction });
    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ error: '工单不存在' });
    }
    if (order.status !== 'pending') {
      await transaction.rollback();
      return res.status(400).json({ error: '当前状态不允许派单' });
    }

    const technician = await Technician.findByPk(technicianId, { transaction });
    if (!technician) {
      await transaction.rollback();
      return res.status(404).json({ error: '师傅不存在' });
    }

    order.status = 'dispatched';
    await order.save({ transaction });

    await Construction.create({
      order_id: order.id,
      technician_id: technicianId,
      dispatch_remark: remark || dispatchRemark,
      dispatched_at: new Date(),
      commission_rate: technician.commission_rate
    }, { transaction });

    await transaction.commit();
    res.json({ message: '派单成功' });
  } catch (error) {
    console.error('派单失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新工单状态 — 统一 PATCH/PUT
async function handleStatusUpdate(req, res) {
  try {
    const { status, cancelReason } = req.body;
    const order = await WorkOrder.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({ error: '工单不存在' });
    }

    if (!status) {
      return res.status(400).json({ error: '请提供目标状态' });
    }

    const validTransitions = {
      pending: ['dispatched', 'cancelled', 'consultation'],
      dispatched: ['completed', 'cancelled'],
      completed: ['callback']
    };

    if (!validTransitions[order.status]?.includes(status)) {
      return res.status(400).json({ error: '无效的状态转换' });
    }

    order.status = status;

    if (status === 'cancelled') {
      order.cancel_reason = cancelReason;
    } else if (status === 'completed') {
      order.completed_at = new Date();
    }

    await order.save();
    res.json({ message: '状态更新成功' });
  } catch (error) {
    console.error('更新工单状态失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
}

router.patch('/:id/status', auth, handleStatusUpdate);
router.put('/:id/status', auth, handleStatusUpdate);

// 取消工单
router.patch('/:id/cancel', auth, async (req, res) => {
  try {
    const { cancelReason } = req.body;
    const order = await WorkOrder.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({ error: '工单不存在' });
    }

    if (!['pending', 'dispatched'].includes(order.status)) {
      return res.status(400).json({ error: '当前状态不允许取消' });
    }

    order.status = 'cancelled';
    order.cancel_reason = cancelReason;
    await order.save();

    res.json({ message: '工单已取消' });
  } catch (error) {
    console.error('取消工单失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 咨询单转正式单
router.patch('/:id/convert', auth, async (req, res) => {
  try {
    const order = await WorkOrder.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ error: '工单不存在' });
    }

    if (order.status !== 'consultation') {
      return res.status(400).json({ error: '只有咨询单才能转为正式单' });
    }

    order.status = 'pending';
    order.received_at = new Date();
    await order.save();

    res.json({ message: '咨询单已转为正式单，当前状态为待派单' });
  } catch (error) {
    console.error('咨询单转正式单失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 录入费用 — 统一 POST /:id/fee 和 PUT /:id/fees
async function handleFeeInput(req, res) {
  try {
    const {
      totalFee,
      serviceFee,
      receivedFee,
      materialCost,
      buildingManagerIncentive,
      commissionRate,
      actualWork
    } = req.body;

    if (totalFee === undefined || totalFee === null) {
      return res.status(400).json({ error: '请提供总费用' });
    }

    const order = await WorkOrder.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ error: '工单不存在' });
    }

    let construction = await Construction.findOne({ where: { order_id: order.id } });
    if (!construction) {
      return res.status(404).json({ error: '施工记录不存在' });
    }

    construction.total_fee = totalFee;
    construction.service_fee = serviceFee || (totalFee * (commissionRate || 0.3));
    construction.received_fee = receivedFee;
    construction.material_cost = materialCost;
    construction.building_manager_incentive = buildingManagerIncentive;
    construction.commission_rate = commissionRate;
    construction.actual_work = actualWork;

    await construction.save();
    res.json({ message: '费用录入成功' });
  } catch (error) {
    console.error('录入费用失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
}

router.post('/:id/fee', auth, handleFeeInput);
router.put('/:id/fees', auth, handleFeeInput);

// 执行回访
router.post('/:id/callback', auth, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      isSatisfied,
      satisfactionScore,
      feeConsistent,
      callbackMethod,
      otherFeedback
    } = req.body;

    // Input validation
    if (satisfactionScore !== undefined && (satisfactionScore < 1 || satisfactionScore > 5)) {
      await transaction.rollback();
      return res.status(400).json({ error: '满意度评分须在 1-5 之间' });
    }

    const orderId = req.params.id;
    const order = await WorkOrder.findByPk(orderId, { transaction });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ error: '工单不存在' });
    }

    if (!['completed', 'callback'].includes(order.status)) {
      await transaction.rollback();
      return res.status(400).json({ error: '当前状态不允许回访' });
    }

    const callback = await CallbackRecord.create({
      order_id: orderId,
      is_satisfied: isSatisfied,
      satisfaction_score: satisfactionScore,
      fee_consistent: feeConsistent,
      callback_method: callbackMethod,
      callback_by: req.user.id,
      other_feedback: otherFeedback,
      callback_at: new Date()
    }, { transaction });

    order.status = 'callback';
    await order.save({ transaction });

    await transaction.commit();
    res.status(201).json(callback);
  } catch (error) {
    await transaction.rollback();
    console.error('提交回访失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
