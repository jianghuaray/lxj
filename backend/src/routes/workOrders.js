const express = require('express');
const { Op, fn, col, literal } = require('sequelize');
const { sequelize, WorkOrder, Customer, Technician, Construction, CallbackRecord, User, Settings, Property, BuildingManager } = require('../models');
const { auth, authAdmin } = require('../middleware/auth');
const { escapeLike, validateLength } = require('../utils/sanitize');
const { calculateShareSnapshot } = require('../utils/shareCalculator');

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

function hasOwn(source, key) {
  return Object.prototype.hasOwnProperty.call(source, key);
}

function applySourceFilters(where, query) {
  const {
    sourceChannel,
    sourceType,
    sourcePropertyId,
    sourceBuildingManagerId
  } = query;

  if (sourceType) where.source_type = sourceType;
  if (sourcePropertyId) where.source_property_id = sourcePropertyId;
  if (sourceBuildingManagerId) where.source_building_manager_id = sourceBuildingManagerId;
  if (sourceChannel) where.source_channel = sourceChannel;
}

async function resolveOrderSourcePayload({
  sourceChannel,
  sourceType,
  sourcePropertyId,
  sourceBuildingManagerId,
  fallbackSourceChannel = null
}, transaction) {
  const resolvedSourceType = sourceType || null;
  const normalizedPropertyId = resolvedSourceType === 'property' ? (sourcePropertyId || null) : null;
  const normalizedBuildingManagerId = resolvedSourceType === 'building_manager' ? (sourceBuildingManagerId || null) : null;

  const sourceProperty = normalizedPropertyId
    ? await Property.findByPk(normalizedPropertyId, { transaction })
    : null;
  const sourceBuildingManager = normalizedBuildingManagerId
    ? await BuildingManager.findByPk(normalizedBuildingManagerId, { transaction })
    : null;

  const resolvedSourceChannel = resolvedSourceType === 'property'
    ? (sourceProperty ? `物业：${sourceProperty.name}` : fallbackSourceChannel)
    : resolvedSourceType === 'building_manager'
      ? (sourceBuildingManager ? `楼管：${sourceBuildingManager.name}` : fallbackSourceChannel)
      : (sourceChannel || fallbackSourceChannel || null);

  return {
    sourceChannel: resolvedSourceChannel,
    sourceType: resolvedSourceType,
    sourcePropertyId: sourceProperty?.id || null,
    sourcePropertyName: sourceProperty?.name || null,
    sourceBuildingManagerId: sourceBuildingManager?.id || null,
    sourceBuildingManagerName: sourceBuildingManager?.name || null
  };
}

// 获取工单列表
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, status, area, problemCategory, category, technicianId, keyword, customerId, customerPhone, overdue, awaitCallback, pendingDispatch } = req.query;

    const where = {};
    if (status) where.status = status;
    if (area) where.area = area;
    applySourceFilters(where, req.query);
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
      constructionWhere.order_amount = { [Op.gt]: feeThreshold };
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
          where: { order_amount: { [Op.gt]: feeThreshold } },
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
        sourceType: o.source_type,
        sourcePropertyId: o.source_property_id,
        sourcePropertyName: o.source_property_name,
        sourceBuildingManagerId: o.source_building_manager_id,
        sourceBuildingManagerName: o.source_building_manager_name,
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
        totalFee: o.construction?.order_amount ?? o.construction?.total_fee ?? null,
        orderAmount: o.construction?.order_amount ?? o.construction?.total_fee ?? null,
        serviceFee: o.construction?.technician_amount ?? o.construction?.service_fee ?? null,
        technicianAmount: o.construction?.technician_amount ?? o.construction?.service_fee ?? null,
        receivedFee: o.construction?.received_amount ?? o.construction?.received_fee ?? null,
        receivedAmount: o.construction?.received_amount ?? o.construction?.received_fee ?? null,
        materialCost: o.construction?.material_cost || null,
        buildingManagerIncentive: o.construction?.building_manager_amount ?? o.construction?.building_manager_incentive ?? null,
        buildingManagerAmount: o.construction?.building_manager_amount ?? o.construction?.building_manager_incentive ?? null,
        commissionRate: o.construction?.technician_rate ?? o.construction?.commission_rate ?? null,
        technicianRate: o.construction?.technician_rate ?? o.construction?.commission_rate ?? null,
        propertyId: o.construction?.property_id || null,
        propertyName: o.construction?.property_name || null,
        propertyRate: o.construction?.property_rate || 0,
        propertyAmount: o.construction?.property_amount || 0,
        buildingManagerId: o.construction?.building_manager_id || null,
        buildingManagerName: o.construction?.building_manager_name || null,
        buildingManagerRate: o.construction?.building_manager_rate || 0,
        companyAmount: o.construction?.company_amount || 0,
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
      sourceType: o.source_type,
      sourcePropertyId: o.source_property_id,
      sourcePropertyName: o.source_property_name,
      sourceBuildingManagerId: o.source_building_manager_id,
      sourceBuildingManagerName: o.source_building_manager_name,
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
      totalFee: o.construction?.order_amount ?? o.construction?.total_fee ?? null,
      orderAmount: o.construction?.order_amount ?? o.construction?.total_fee ?? null,
      serviceFee: o.construction?.technician_amount ?? o.construction?.service_fee ?? null,
      technicianAmount: o.construction?.technician_amount ?? o.construction?.service_fee ?? null,
      receivedFee: o.construction?.received_amount ?? o.construction?.received_fee ?? null,
      receivedAmount: o.construction?.received_amount ?? o.construction?.received_fee ?? null,
      materialCost: o.construction?.material_cost || null,
      buildingManagerIncentive: o.construction?.building_manager_amount ?? o.construction?.building_manager_incentive ?? null,
      commissionRate: o.construction?.technician_rate ?? o.construction?.commission_rate ?? null,
      technicianRate: o.construction?.technician_rate ?? o.construction?.commission_rate ?? null,
      propertyId: o.construction?.property_id || null,
      propertyName: o.construction?.property_name || null,
      propertyRate: Number(o.construction?.property_rate) || 0,
      propertyAmount: Number(o.construction?.property_amount) || 0,
      buildingManagerId: o.construction?.building_manager_id || null,
      buildingManagerName: o.construction?.building_manager_name || null,
      buildingManagerRate: Number(o.construction?.building_manager_rate) || 0,
      buildingManagerAmount: Number(o.construction?.building_manager_amount ?? o.construction?.building_manager_incentive) || 0,
      shareBaseAmount: Number(o.construction?.share_base_amount) || 0,
      companyAmount: Number(o.construction?.company_amount) || 0,
      collectionParty: o.construction?.collection_party || 'technician',
      technicianSettlementStatus: o.construction?.technician_settlement_status || 'unsettled',
      propertySettlementStatus: o.construction?.property_settlement_status || 'unsettled',
      buildingManagerSettlementStatus: o.construction?.building_manager_settlement_status || 'unsettled',
      actualWork: o.construction?.actual_work || null,
      callbackRecord,
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
      sourceType,
      sourcePropertyId,
      sourceBuildingManagerId,
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
      // phone 格式验证已移除，仅校验必填
    }

    const resolvedSource = await resolveOrderSourcePayload({
      sourceChannel,
      sourceType,
      sourcePropertyId,
      sourceBuildingManagerId
    }, transaction);

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
        source_channel: resolvedSource.sourceChannel
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
      source_channel: resolvedSource.sourceChannel,
      source_type: resolvedSource.sourceType,
      source_property_id: resolvedSource.sourcePropertyId,
      source_property_name: resolvedSource.sourcePropertyName,
      source_building_manager_id: resolvedSource.sourceBuildingManagerId,
      source_building_manager_name: resolvedSource.sourceBuildingManagerName,
      problem_category: problemCategory,
      problem_description: problemDescription,
      receiver_id: req.user.id,
      received_at: new Date(),
      receiver_remark: receiverRemark
    }, { transaction });

    // 维护客户统计字段
    await Customer.increment('total_orders', { where: { id: customer.id }, transaction });
    await Customer.update({ last_order_at: new Date() }, { where: { id: customer.id }, transaction });

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

    const allowedFields = ['customerName', 'customerPhone', 'area', 'address', 'sourceChannel', 'sourceType', 'sourcePropertyId', 'sourceBuildingManagerId', 'problemCategory', 'problemDescription', 'receiverRemark'];
    const fieldMap = {
      customerName: 'customer_name',
      customerPhone: 'customer_phone',
      problemCategory: 'problem_category',
      problemDescription: 'problem_description',
      receiverRemark: 'receiver_remark'
    };

    allowedFields.forEach(field => {
      if (!['sourceChannel', 'sourceType', 'sourcePropertyId', 'sourceBuildingManagerId'].includes(field) && req.body[field] !== undefined) {
        const dbField = fieldMap[field] || field;
        order[dbField] = req.body[field];
      }
    });

    const shouldResolveSource = ['sourceChannel', 'sourceType', 'sourcePropertyId', 'sourceBuildingManagerId']
      .some(field => hasOwn(req.body, field));

    if (shouldResolveSource) {
      const resolvedSource = await resolveOrderSourcePayload({
        sourceChannel: hasOwn(req.body, 'sourceChannel') ? req.body.sourceChannel : order.source_channel,
        sourceType: hasOwn(req.body, 'sourceType') ? req.body.sourceType : order.source_type,
        sourcePropertyId: hasOwn(req.body, 'sourcePropertyId') ? req.body.sourcePropertyId : order.source_property_id,
        sourceBuildingManagerId: hasOwn(req.body, 'sourceBuildingManagerId') ? req.body.sourceBuildingManagerId : order.source_building_manager_id,
        fallbackSourceChannel: order.source_channel
      });

      order.source_channel = resolvedSource.sourceChannel;
      order.source_type = resolvedSource.sourceType;
      order.source_property_id = resolvedSource.sourcePropertyId;
      order.source_property_name = resolvedSource.sourcePropertyName;
      order.source_building_manager_id = resolvedSource.sourceBuildingManagerId;
      order.source_building_manager_name = resolvedSource.sourceBuildingManagerName;
    }

    await order.save();
    res.json({ message: '工单信息更新成功' });
  } catch (error) {
    console.error('更新工单信息失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

async function handleAssign(req, res) {
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
    const sourceProperty = order.source_property_id
      ? await Property.findByPk(order.source_property_id, { transaction })
      : null;
    const sourceBuildingManager = order.source_building_manager_id
      ? await BuildingManager.findByPk(order.source_building_manager_id, { transaction })
      : null;

    order.status = 'dispatched';
    await order.save({ transaction });

    await Construction.create({
      order_id: order.id,
      technician_id: technicianId,
      property_id: order.source_property_id || null,
      property_name: order.source_property_name || null,
      property_rate: sourceProperty?.default_rate || 0,
      building_manager_id: order.source_building_manager_id || null,
      building_manager_name: order.source_building_manager_name || null,
      building_manager_rate: sourceBuildingManager?.default_rate || 0,
      dispatch_remark: remark || dispatchRemark,
      dispatched_at: new Date(),
      commission_rate: technician.commission_rate,
      technician_rate: technician.commission_rate,
      collection_party: sourceProperty?.default_collection_party || 'technician'
    }, { transaction });

    await transaction.commit();
    res.json({ message: '派单成功' });
  } catch (error) {
    await transaction.rollback();
    console.error('派单失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
}

router.post('/:id/assign', auth, handleAssign);

// /dispatch 保留做兼容，转发到 assign 逻辑
router.post('/:id/dispatch', auth, (req, res) => {
  req.body.remark = req.body.remark || req.body.dispatchRemark;
  return handleAssign(req, res);
});

// 更新工单状态 — 统一 PATCH/PUT
async function handleStatusUpdate(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { status, cancelReason, completedAt } = req.body;
    const order = await WorkOrder.findByPk(req.params.id, { transaction });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ error: '工单不存在' });
    }

    if (!status) {
      await transaction.rollback();
      return res.status(400).json({ error: '请提供目标状态' });
    }

    const validTransitions = {
      pending: ['dispatched', 'cancelled', 'consultation'],
      dispatched: ['completed', 'cancelled'],
      completed: ['callback']
    };

    if (!validTransitions[order.status]?.includes(status)) {
      await transaction.rollback();
      return res.status(400).json({ error: '无效的状态转换' });
    }

    order.status = status;

    if (status === 'cancelled') {
      order.cancel_reason = cancelReason;
    } else if (status === 'completed') {
      order.completed_at = completedAt ? new Date(completedAt) : new Date();
    }

    await order.save({ transaction });

    await transaction.commit();
    res.json({ message: '状态更新成功' });
  } catch (error) {
    await transaction.rollback();
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
  const transaction = await sequelize.transaction();
  try {
    const {
      orderAmount,
      totalFee,
      technicianId,
      technicianRate,
      commissionRate,
      receivedAmount,
      receivedFee,
      materialCost,
      propertyId,
      propertyRate,
      buildingManagerId,
      buildingManagerRate,
      actualWork,
      completedAt,
      collectionParty,
      technicianSettlementStatus,
      propertySettlementStatus,
      buildingManagerSettlementStatus
    } = req.body;

    const effectiveOrderAmount = orderAmount ?? totalFee;
    if (effectiveOrderAmount === undefined || effectiveOrderAmount === null) {
      await transaction.rollback();
      return res.status(400).json({ error: '请提供总费用' });
    }

    const order = await WorkOrder.findByPk(req.params.id, { transaction });
    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ error: '工单不存在' });
    }

    let construction = await Construction.findOne({ where: { order_id: order.id }, transaction });
    if (!construction) {
      await transaction.rollback();
      return res.status(404).json({ error: '施工记录不存在' });
    }

    const oldTotalFee = Number(construction.order_amount ?? construction.total_fee) || 0;
    const newTotalFee = parseFloat(effectiveOrderAmount) || 0;
    const feeDiff = newTotalFee - oldTotalFee;

    const effectivePropertyId = hasOwn(req.body, 'propertyId')
      ? (propertyId || null)
      : (construction.property_id ?? order.source_property_id ?? null);
    const effectiveBuildingManagerId = hasOwn(req.body, 'buildingManagerId')
      ? (buildingManagerId || null)
      : (construction.building_manager_id ?? order.source_building_manager_id ?? null);
    const technician = await Technician.findByPk(technicianId || construction.technician_id, { transaction });
    const property = effectivePropertyId ? await Property.findByPk(effectivePropertyId, { transaction }) : null;
    const buildingManager = effectiveBuildingManagerId ? await BuildingManager.findByPk(effectiveBuildingManagerId, { transaction }) : null;
    const shareSnapshot = calculateShareSnapshot({
      orderAmount: newTotalFee,
      technicianRate: technicianRate ?? commissionRate ?? technician?.commission_rate ?? construction.technician_rate ?? construction.commission_rate ?? 0,
      propertyRate: propertyRate ?? property?.default_rate ?? construction.property_rate ?? 0,
      buildingManagerRate: buildingManagerRate ?? buildingManager?.default_rate ?? construction.building_manager_rate ?? 0,
      materialCost,
      receivedAmount: receivedAmount ?? receivedFee ?? newTotalFee
    });

    construction.technician_id = technicianId || construction.technician_id;
    construction.total_fee = shareSnapshot.orderAmount;
    construction.order_amount = shareSnapshot.orderAmount;
    construction.service_fee = shareSnapshot.technicianAmount;
    construction.technician_amount = shareSnapshot.technicianAmount;
    construction.share_base_amount = shareSnapshot.shareBaseAmount;
    construction.received_fee = shareSnapshot.receivedAmount;
    construction.received_amount = shareSnapshot.receivedAmount;
    construction.material_cost = shareSnapshot.materialCost;
    construction.commission_rate = shareSnapshot.technicianRate;
    construction.technician_rate = shareSnapshot.technicianRate;
    construction.property_id = property?.id || null;
    construction.property_name = property?.name || null;
    construction.property_rate = shareSnapshot.propertyRate;
    construction.property_amount = shareSnapshot.propertyAmount;
    construction.building_manager_id = buildingManager?.id || null;
    construction.building_manager_name = buildingManager?.name || null;
    construction.building_manager_rate = shareSnapshot.buildingManagerRate;
    construction.building_manager_amount = shareSnapshot.buildingManagerAmount;
    construction.building_manager_incentive = shareSnapshot.buildingManagerAmount;
    construction.company_amount = shareSnapshot.companyAmount;
    construction.collection_party = collectionParty ?? property?.default_collection_party ?? construction.collection_party ?? 'technician';
    construction.technician_settlement_status = technicianSettlementStatus ?? construction.technician_settlement_status ?? 'unsettled';
    construction.property_settlement_status = propertySettlementStatus ?? construction.property_settlement_status ?? 'unsettled';
    construction.building_manager_settlement_status = buildingManagerSettlementStatus ?? construction.building_manager_settlement_status ?? 'unsettled';
    construction.actual_work = actualWork;

    await construction.save({ transaction });

    if (completedAt) {
      order.completed_at = new Date(completedAt);
      await order.save({ transaction });
    }

    // 维护客户统计字段：按费用差额更新 total_amount
    if (feeDiff !== 0) {
      await Customer.increment('total_amount', { by: feeDiff, where: { id: order.customer_id }, transaction });
    }

    await transaction.commit();
    res.json({ message: '费用录入成功' });
  } catch (error) {
    await transaction.rollback();
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

// 删除工单（仅管理员可操作）
router.delete('/:id', auth, authAdmin, async (req, res) => {
  try {
    const order = await WorkOrder.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ error: '工单不存在' });
    }

    // 先查施工记录，获取需要扣减的费用
    const construction = await Construction.findOne({ where: { order_id: order.id } });
    const feeToDeduct = construction?.total_fee || 0;

    await sequelize.transaction(async (transaction) => {
      await CallbackRecord.destroy({ where: { order_id: order.id }, transaction });
      await Construction.destroy({ where: { order_id: order.id }, transaction });
      await order.destroy({ transaction });

      // 维护客户统计字段：扣减工单数、费用总额
      await Customer.decrement('total_orders', { by: 1, where: { id: order.customer_id }, transaction });
      if (feeToDeduct > 0) {
        await Customer.decrement('total_amount', { by: feeToDeduct, where: { id: order.customer_id }, transaction });
      }
    });

    res.json({ message: '工单已删除' });
  } catch (error) {
    console.error('删除工单失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
