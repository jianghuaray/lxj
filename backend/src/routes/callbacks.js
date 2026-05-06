const express = require('express');
const { Op, fn, col, literal } = require('sequelize');
const { sequelize, CallbackRecord, WorkOrder, Customer, User, Construction, Technician } = require('../models');
const { auth } = require('../middleware/auth');

const router = express.Router();

// 获取回访记录列表
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, status, keyword } = req.query;
    const offset = (page - 1) * pageSize;

    // If status is 'pending', return completed orders without callback records
    if (status === 'pending') {
      // 只返回没有回访记录的已完成工单
      const { count: total, rows: completedOrders } = await WorkOrder.findAndCountAll({
        where: {
          status: 'completed',
          '$callback.id$': null
        },
        include: [
          { model: Customer, as: 'customer' },
          { model: CallbackRecord, as: 'callback', required: false }
        ],
        order: [['completed_at', 'ASC']],
        limit: parseInt(pageSize),
        offset,
        subQuery: false
      });

      const items = completedOrders.map(order => {
        const o = order.toJSON();
        const completedAt = o.completed_at ? new Date(o.completed_at) : null;
        const waitDays = completedAt ? Math.floor((Date.now() - completedAt.getTime()) / (1000 * 60 * 60 * 24)) : 0;

        return {
          id: `pending_${o.id}`,  // Temporary ID for pending items
          orderId: o.id,
          orderNo: o.order_no,
          customerName: o.customer_name,
          customerPhone: o.customer_phone,
          completedAt: o.completed_at,
          waitDays,
          status: 'pending',
          satisfactionScore: null,
          callbackAt: null,
          callbackMethod: null,
          isSatisfied: null
        };
      });

      const pendingCount = total;

      return res.json({
        items,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        pendingCount
      });
    }

    // For completed/skipped callbacks, query CallbackRecord
    const where = {};
    if (status === 'completed') {
      // Already has callback records
    } else if (status === 'skipped') {
      // Skipped callbacks - we'll handle this with a skip flag
      // For now, return empty as skip isn't a standard model field
    }

    const { count, rows } = await CallbackRecord.findAndCountAll({
      where,
      include: [
        {
          model: WorkOrder,
          as: 'order',
          include: [{ model: Customer, as: 'customer' }]
        },
        { model: User, as: 'callbackUser' }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(pageSize),
      offset
    });

    // Get pending count
    const pendingCount = await WorkOrder.count({ where: { status: 'completed' } });

    const items = rows.map(record => {
      const r = record.toJSON();
      const completedAt = r.order?.completed_at ? new Date(r.order.completed_at) : null;
      const waitDays = completedAt ? Math.floor((completedAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

      return {
        id: r.id,
        orderId: r.order_id,
        orderNo: r.order?.order_no || '-',
        customerName: r.order?.customer_name || '-',
        customerPhone: r.order?.customer_phone || '-',
        completedAt: r.order?.completed_at,
        waitDays: Math.abs(waitDays),
        status: 'completed',
        satisfactionScore: r.satisfaction_score,
        callbackAt: r.callback_at,
        callbackMethod: r.callback_method,
        isSatisfied: r.is_satisfied,
        feeConsistent: r.fee_consistent,
        otherFeedback: r.other_feedback
      };
    });

    res.json({
      items,
      total: count,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      pendingCount
    });
  } catch (error) {
    console.error('获取回访列表失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取待回访列表
router.get('/pending', auth, async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;

    // 只返回没有回访记录的已完成工单
    const { count, rows } = await WorkOrder.findAndCountAll({
      where: {
        status: 'completed',
        '$callback.id$': null
      },
      include: [
        { model: Customer, as: 'customer' },
        { model: CallbackRecord, as: 'callback', required: false }
      ],
      order: [['completed_at', 'ASC']],
      limit: parseInt(pageSize),
      offset,
      subQuery: false
    });

    res.json({
      items: rows,
      total: count,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (error) {
    console.error('获取待回访列表失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 提交回访 (POST /callbacks/:id/complete - frontend CallbackList uses this)
router.post('/:id/complete', auth, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      isSatisfied,
      satisfactionScore,
      feeConsistent,
      callbackMethod,
      otherFeedback
    } = req.body;

    // The ID might be a pending_ prefixed temporary ID or a real callback record ID
    let orderId = req.params.id;
    if (orderId.startsWith('pending_')) {
      orderId = orderId.replace('pending_', '');
    }

    const order = await WorkOrder.findByPk(orderId, { transaction });
    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ error: '工单不存在' });
    }

    if (order.status !== 'completed') {
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

    // Update order status
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

// 标记无需回访 (PATCH /callbacks/:id - frontend uses this)
router.patch('/:id', auth, async (req, res) => {
  try {
    const { status, skipReason } = req.body;

    // If skipping, update the order to note it was skipped
    let orderId = req.params.id;
    if (orderId.startsWith('pending_')) {
      orderId = orderId.replace('pending_', '');
    }

    if (status === 'skipped') {
      const order = await WorkOrder.findByPk(orderId);
      if (!order) {
        return res.status(404).json({ error: '工单不存在' });
      }

      // Create a callback record marking it as skipped
      // Use 'phone' as callback_method since 'skipped' is not a valid ENUM value
      await CallbackRecord.create({
        order_id: orderId,
        is_satisfied: true,
        satisfaction_score: 0,
        fee_consistent: true,
        callback_method: 'phone',
        callback_by: req.user.id,
        other_feedback: `[无需回访] ${skipReason || ''}`,
        callback_at: new Date()
      });

      order.status = 'callback';
      await order.save();

      return res.json({ message: '已标记为无需回访' });
    }

    res.status(400).json({ error: '无效的操作' });
  } catch (error) {
    console.error('更新回访状态失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
