const express = require('express');
const { Op, fn, col } = require('sequelize');
const { Customer, WorkOrder, Construction, CallbackRecord, Technician } = require('../models');
const { auth, authAdmin } = require('../middleware/auth');
const { escapeLike, validateLength } = require('../utils/sanitize');

const router = express.Router();

// Format a customer row to camelCase DTO for frontend
function formatCustomer(c) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    area: c.area || '',
    address: c.address || '',
    level: c.level,
    tags: c.tags || [],
    remark: c.remark || '',
    sourceChannel: c.source_channel || '',
    totalOrders: c.total_orders || 0,
    totalAmount: c.total_amount || 0,
    lastOrderAt: c.last_order_at || null,
    createdAt: c.created_at || null,
    updatedAt: c.updated_at || null
  };
}

// 获取客户列表
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, level, area, keyword } = req.query;

    const where = {};
    if (level) where.level = level;
    if (area) where.area = area;
    if (keyword) {
      const safeKeyword = escapeLike(keyword);
      where[Op.or] = [
        { name: { [Op.like]: `%${safeKeyword}%` } },
        { phone: { [Op.like]: `%${safeKeyword}%` } },
        { address: { [Op.like]: `%${safeKeyword}%` } }
      ];
    }

    const offset = (page - 1) * pageSize;

    const { count, rows } = await Customer.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(pageSize),
      offset
    });

    // Format to camelCase DTOs
    const items = rows.map(formatCustomer);

    res.json({
      items,
      total: count,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (error) {
    console.error('获取客户列表失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 按手机号查找客户 - MUST be before /:id to avoid param capture
router.get('/search/phone', auth, async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ error: '请提供手机号' });
    }

    const customer = await Customer.findOne({ where: { phone } });
    if (!customer) {
      return res.json(null);
    }

    res.json(formatCustomer(customer));
  } catch (error) {
    console.error('查找客户失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取客户详情
router.get('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);

    if (!customer) {
      return res.status(404).json({ error: '客户不存在' });
    }

    // Get orders with computed fields
    const orders = await WorkOrder.findAll({
      where: { customer_id: req.params.id },
      include: [
        { model: Construction, as: 'construction', include: [{ model: Technician, as: 'technician' }] },
        { model: CallbackRecord, as: 'callback' }
      ],
      order: [['created_at', 'DESC']],
      limit: 20
    });

    const c = customer.toJSON();

    // Compute stats
    const totalOrders = orders.length;
    const totalAmount = orders.reduce((sum, o) => sum + (o.construction?.total_fee || 0), 0);
    const satisfactionScores = orders
      .map(o => o.callback?.satisfaction_score)
      .filter(s => s !== null && s !== undefined);
    const avgSatisfaction = satisfactionScores.length > 0
      ? (satisfactionScores.reduce((a, b) => a + b, 0) / satisfactionScores.length).toFixed(1)
      : null;

    // Format orders to camelCase
    const formattedOrders = orders.map(o => ({
      id: o.id,
      orderNo: o.order_no,
      status: o.status,
      problemCategory: o.problem_category,
      problemDescription: o.problem_description || '',
      createdAt: o.created_at,
      completedAt: o.completed_at,
      technicianName: o.construction?.technician?.name || null,
      totalFee: o.construction?.total_fee || null,
      satisfactionScore: o.callback?.satisfaction_score || null
    }));

    res.json({
      ...formatCustomer(c),
      totalOrders,
      totalAmount,
      avgSatisfaction,
      orders: formattedOrders
    });
  } catch (error) {
    console.error('获取客户详情失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 创建客户
router.post('/', auth, async (req, res) => {
  try {
    const {
      name, phone, area, address, level, tags, remark, sourceChannel } = req.body;

    // Input validation
    if (!name || !name.trim()) return res.status(400).json({ error: '客户姓名不能为空' });
    if (!phone) return res.status(400).json({ error: '手机号不能为空' });

    const existingCustomer = await Customer.findOne({ where: { phone } });
    if (existingCustomer) {
      return res.status(400).json({ error: '该手机号已存在' });
    }

    const customer = await Customer.create({
      name,
      phone,
      area,
      address,
      level: level || 'normal',
      tags: tags || [],
      remark,
      source_channel: sourceChannel
    });

    res.status(201).json(formatCustomer(customer));
  } catch (error) {
    console.error('创建客户失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新客户 (PUT)
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      name, phone, area, address, level, tags, remark
    } = req.body;

    const customer = await Customer.findByPk(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: '客户不存在' });
    }

    if (phone && phone !== customer.phone) {
      const existingCustomer = await Customer.findOne({ where: { phone } });
      if (existingCustomer) {
        return res.status(400).json({ error: '该手机号已存在' });
      }
    }

    await customer.update({
      name,
      phone,
      area,
      address,
      level,
      tags,
      remark
    });

    res.json({ message: '更新成功' });
  } catch (error) {
    console.error('更新客户失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新客户等级 (PATCH /customers/:id/level) - specific route before general PATCH /:id
router.patch('/:id/level', auth, async (req, res) => {
  try {
    const { level } = req.body;
    const customer = await Customer.findByPk(req.params.id);

    if (!customer) {
      return res.status(404).json({ error: '客户不存在' });
    }

    if (!['normal', 'vip', 'blacklist'].includes(level)) {
      return res.status(400).json({ error: '无效的客户等级' });
    }

    await customer.update({ level });
    res.json({ message: '等级更新成功', level });
  } catch (error) {
    console.error('更新客户等级失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新客户标签 (PATCH /customers/:id/tags) - specific route before general PATCH /:id
router.patch('/:id/tags', auth, async (req, res) => {
  try {
    const { tags } = req.body;
    const customer = await Customer.findByPk(req.params.id);

    if (!customer) {
      return res.status(404).json({ error: '客户不存在' });
    }

    await customer.update({ tags: tags || [] });
    res.json({ message: '标签更新成功', tags });
  } catch (error) {
    console.error('更新客户标签失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// General PATCH for partial updates - must come after specific /:id/level and /:id/tags
router.patch('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: '客户不存在' });
    }

    const { name, phone, area, address, level, tags, remark } = req.body;

    if (phone && phone !== customer.phone) {
      const existingCustomer = await Customer.findOne({ where: { phone } });
      if (existingCustomer) {
        return res.status(400).json({ error: '该手机号已存在' });
      }
    }

    await customer.update({
      ...(name !== undefined && { name }),
      ...(phone !== undefined && { phone }),
      ...(area !== undefined && { area }),
      ...(address !== undefined && { address }),
      ...(level !== undefined && { level }),
      ...(tags !== undefined && { tags }),
      ...(remark !== undefined && { remark })
    });

    res.json({ message: '更新成功' });
  } catch (error) {
    console.error('更新客户失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 删除客户（仅管理员可操作）
router.delete('/:id', auth, authAdmin, async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: '客户不存在' });
    }

    await customer.destroy();
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除客户失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
