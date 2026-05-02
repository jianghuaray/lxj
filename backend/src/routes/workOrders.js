const express = require('express');
const { Op, fn, col, literal } = require('sequelize');
const { WorkOrder, Customer, Technician, Construction, CallbackRecord, User } = require('../models');
const { auth } = require('../middleware/auth');

const router = express.Router();

// 获取工单列表
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, status, area, problemCategory, category, technicianId, keyword, customerId, customerPhone } = req.query;

    const where = {};
    if (status) where.status = status;
    if (area) where.area = area;
    if (problemCategory || category) where.problem_category = problemCategory || category;
    if (technicianId) {
      // Need to filter by construction's technician
      const constructions = await Construction.findAll({
        where: { technician_id: technicianId },
        attributes: ['order_id']
      });
      const orderIds = constructions.map(c => c.order_id);
      if (orderIds.length === 0) {
        // No matching constructions, return empty result
        return res.json({ items: [], total: 0, page: parseInt(page), pageSize: parseInt(pageSize), statusCounts: {} });
      }
      where.id = { [Op.in]: orderIds };
    }
    if (customerId) where.customer_id = customerId;
    if (customerPhone) where.customer_phone = { [Op.like]: `%${customerPhone}%` };
    if (keyword) {
      where[Op.or] = [
        { order_no: { [Op.like]: `%${keyword}%` } },
        { customer_name: { [Op.like]: `%${keyword}%` } },
        { customer_phone: { [Op.like]: `%${keyword}%` } },
        { address: { [Op.like]: `%${keyword}%` } }
      ];
    }

    const offset = (page - 1) * pageSize;

    const { count, rows } = await WorkOrder.findAndCountAll({
      where,
      include: [
        { model: Customer, as: 'customer' },
        {
          model: Construction,
          as: 'construction',
          include: [{ model: Technician, as: 'technician' }]
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(pageSize),
      offset
    });

    // Get status counts for tabs - single grouped query instead of 7 separate queries
    const statusCountsRaw = await WorkOrder.findAll({
      attributes: ['status', [fn('COUNT', literal('*')), 'count']],
      group: ['status']
    });
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
      statusCounts
    });
  } catch (error) {
    console.error('获取工单列表失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取统计数据 - must be before /:id route
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const todayCount = await WorkOrder.count({
      where: { created_at: { [Op.gte]: todayStart } }
    });

    const pendingCount = await WorkOrder.count({ where: { status: 'pending' } });
    const pendingCallbackCount = await WorkOrder.count({ where: { status: 'completed' } });

    const totalRevenue = await Construction.sum('service_fee');

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
        { model: CallbackRecord, as: 'callback' },
        { model: User, as: 'receiver' }
      ]
    });

    if (!order) {
      return res.status(404).json({ error: '工单不存在' });
    }

    const o = order.toJSON();

    // Format callback record
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

    // Get customer history orders
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
      // Construction info
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
      // Callback
      callbackRecord,
      // Customer
      customerLevel: o.customer?.level || null,
      customerTags: o.customer?.tags || [],
      // History
      historyOrders: historyFormatted
    });
  } catch (error) {
    console.error('获取工单详情失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 创建工单
router.post('/', auth, async (req, res) => {
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

    // Check if customer exists
    let customer = await Customer.findByPk(customerId);
    if (!customer && customerPhone) {
      customer = await Customer.findOne({ where: { phone: customerPhone } });
    }

    if (!customer) {
      customer = await Customer.create({
        name: customerName,
        phone: customerPhone,
        area,
        address,
        source_channel: sourceChannel
      });
    }

    // Generate order number - use timestamp + random suffix for concurrency safety
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const timePart = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0') + String(now.getSeconds()).padStart(2, '0');
    const randomPart = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
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
    });

    res.status(201).json(order);
  } catch (error) {
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

// 派单 (POST /orders/:id/assign - frontend calls this)
router.post('/:id/assign', auth, async (req, res) => {
  try {
    const { technicianId, remark } = req.body;
    const order = await WorkOrder.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({ error: '工单不存在' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ error: '当前状态不允许派单' });
    }

    const technician = await Technician.findByPk(technicianId);
    if (!technician) {
      return res.status(404).json({ error: '师傅不存在' });
    }

    // Update order status
    order.status = 'dispatched';
    await order.save();

    // Create construction record
    await Construction.create({
      order_id: order.id,
      technician_id: technicianId,
      dispatch_remark: remark || req.body.dispatchRemark,
      dispatched_at: new Date(),
      commission_rate: technician.commission_rate
    });

    res.json({ message: '派单成功' });
  } catch (error) {
    console.error('派单失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// Also support the original dispatch route for backward compatibility
router.post('/:id/dispatch', auth, async (req, res) => {
  try {
    const { technicianId, dispatchRemark } = req.body;
    const order = await WorkOrder.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({ error: '工单不存在' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ error: '当前状态不允许派单' });
    }

    const technician = await Technician.findByPk(technicianId);
    if (!technician) {
      return res.status(404).json({ error: '师傅不存在' });
    }

    order.status = 'dispatched';
    await order.save();

    await Construction.create({
      order_id: order.id,
      technician_id: technicianId,
      dispatch_remark: dispatchRemark,
      dispatched_at: new Date(),
      commission_rate: technician.commission_rate
    });

    res.json({ message: '派单成功' });
  } catch (error) {
    console.error('派单失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新工单状态 (PATCH /orders/:id/status - frontend uses PATCH)
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status, cancelReason } = req.body;
    const order = await WorkOrder.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({ error: '工单不存在' });
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
});

// Also support PUT for backward compatibility
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status, cancelReason } = req.body;
    const order = await WorkOrder.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({ error: '工单不存在' });
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
});

// 取消工单 (PATCH /orders/:id/cancel - frontend uses this)
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

// 录入费用 (POST /orders/:id/fee - frontend uses this)
router.post('/:id/fee', auth, async (req, res) => {
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
});

// Also support PUT for backward compatibility
router.put('/:id/fees', auth, async (req, res) => {
  try {
    const {
      totalFee,
      serviceFee,
      receivedFee,
      materialCost,
      buildingManagerIncentive,
      actualWork
    } = req.body;

    const order = await WorkOrder.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ error: '工单不存在' });
    }

    let construction = await Construction.findOne({ where: { order_id: order.id } });
    if (!construction) {
      return res.status(404).json({ error: '施工记录不存在' });
    }

    construction.total_fee = totalFee;
    construction.service_fee = serviceFee || totalFee * 0.3;
    construction.received_fee = receivedFee;
    construction.material_cost = materialCost;
    construction.building_manager_incentive = buildingManagerIncentive;
    construction.actual_work = actualWork;

    await construction.save();
    res.json({ message: '费用录入成功' });
  } catch (error) {
    console.error('录入费用失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 执行回访 (POST /orders/:id/callback - frontend uses this)
router.post('/:id/callback', auth, async (req, res) => {
  try {
    const {
      isSatisfied,
      satisfactionScore,
      feeConsistent,
      callbackMethod,
      otherFeedback
    } = req.body;

    const orderId = req.params.id;
    const order = await WorkOrder.findByPk(orderId);

    if (!order) {
      return res.status(404).json({ error: '工单不存在' });
    }

    if (!['completed', 'callback'].includes(order.status)) {
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
    });

    // Update order status
    order.status = 'callback';
    await order.save();

    res.status(201).json(callback);
  } catch (error) {
    console.error('提交回访失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
