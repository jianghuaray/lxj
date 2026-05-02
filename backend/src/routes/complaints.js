const express = require('express');
const { Op } = require('sequelize');
const { Complaint, WorkOrder, User, CallbackRecord } = require('../models');
const { auth } = require('../middleware/auth');

const router = express.Router();

// 获取投诉列表
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, status, keyword } = req.query;

    const where = {};
    if (status) where.status = status;
    if (keyword) {
      where[Op.or] = [
        { content: { [Op.like]: `%${keyword}%` } },
        { '$order.order_no$': { [Op.like]: `%${keyword}%` } },
        { '$order.customer_name$': { [Op.like]: `%${keyword}%` } }
      ];
    }

    const offset = (page - 1) * pageSize;

    const { count, rows } = await Complaint.findAndCountAll({
      where,
      include: [
        { model: WorkOrder, as: 'order' },
        { model: User, as: 'handler' }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(pageSize),
      offset,
      distinct: true
    });

    // Get pending count
    const pendingCount = await Complaint.count({ where: { status: 'pending' } });

    const items = rows.map(complaint => {
      const c = complaint.toJSON();
      const createdAt = c.created_at ? new Date(c.created_at) : null;
      const waitDays = createdAt ? Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0;

      return {
        id: c.id,
        orderId: c.order_id,
        orderNo: c.order?.order_no || '-',
        source: c.source,
        content: c.content,
        handlerId: c.handler_id,
        handlerName: c.handler?.real_name || null,
        status: c.status,
        result: c.result,
        resolvedAt: c.resolved_at,
        createdAt: c.created_at,
        waitDays
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
    console.error('获取投诉列表失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 创建投诉
router.post('/', auth, async (req, res) => {
  try {
    const { orderId, source, content } = req.body;

    const complaint = await Complaint.create({
      order_id: orderId,
      source,
      content,
      handler_id: req.user.id,
      status: 'pending'
    });

    res.status(201).json(complaint);
  } catch (error) {
    console.error('创建投诉失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新投诉 (PATCH /complaints/:id - frontend uses PATCH)
router.patch('/:id', auth, async (req, res) => {
  try {
    const { status, result, content, source } = req.body;

    const complaint = await Complaint.findByPk(req.params.id);
    if (!complaint) {
      return res.status(404).json({ error: '投诉不存在' });
    }

    if (status) complaint.status = status;
    if (result) complaint.result = result;
    if (content) complaint.content = content;
    if (source) complaint.source = source;
    complaint.handler_id = req.user.id;

    if (status === 'resolved' || status === 'closed') {
      complaint.resolved_at = new Date();
    }

    await complaint.save();

    res.json({ message: '更新成功' });
  } catch (error) {
    console.error('更新投诉失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新投诉状态 (PUT /complaints/:id/status - backward compatibility)
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status, result } = req.body;

    const complaint = await Complaint.findByPk(req.params.id);
    if (!complaint) {
      return res.status(404).json({ error: '投诉不存在' });
    }

    complaint.status = status;
    complaint.result = result;
    complaint.handler_id = req.user.id;

    if (status === 'resolved' || status === 'closed') {
      complaint.resolved_at = new Date();
    }

    await complaint.save();

    res.json({ message: '更新成功' });
  } catch (error) {
    console.error('更新投诉状态失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
