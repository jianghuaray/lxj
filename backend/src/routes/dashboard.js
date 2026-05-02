const express = require('express');
const { Op, fn, col, literal } = require('sequelize');
const {
  WorkOrder,
  Construction,
  CallbackRecord,
  Technician,
  Customer,
  Complaint
} = require('../models');
const { auth } = require('../middleware/auth');

const router = express.Router();

// 获取仪表盘统计数据
router.get('/', auth, async (req, res) => {
  try {
    const { timeRange } = req.query;

    // Determine date range
    const now = new Date();
    let startDate;
    switch (timeRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'quarter':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 3);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const dateWhere = { created_at: { [Op.gte]: startDate } };

    // Basic counts
    const totalOrders = await WorkOrder.count({ where: dateWhere });

    const completedOrders = await WorkOrder.count({
      where: { ...dateWhere, status: { [Op.in]: ['completed', 'callback'] } }
    });
    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders * 100).toFixed(1) : 0;

    const cancelledOrders = await WorkOrder.count({
      where: { ...dateWhere, status: 'cancelled' }
    });
    const cancelRate = totalOrders > 0 ? (cancelledOrders / totalOrders * 100).toFixed(1) : 0;

    // Average satisfaction
    const avgSatisfaction = await CallbackRecord.findOne({
      attributes: [[fn('AVG', col('satisfaction_score')), 'avg']],
      where: {
        satisfaction_score: { [Op.not]: null },
        callback_at: { [Op.gte]: startDate }
      }
    });

    // Total revenue
    const totalRevenue = await Construction.sum('service_fee', {
      where: { created_at: { [Op.gte]: startDate } }
    });

    // Pending callback count
    const pendingCallbackCount = await WorkOrder.count({ where: { status: 'completed' } });

    // Pending complaint count
    const pendingComplaintCount = await Complaint.count({ where: { status: { [Op.in]: ['pending', 'processing'] } } });

    // Today orders
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayOrders = await WorkOrder.count({
      where: { created_at: { [Op.gte]: todayStart } }
    });

    // Pending dispatch
    const pendingCount = await WorkOrder.count({ where: { status: 'pending' } });

    res.json({
      totalOrders,
      todayOrders,
      completionRate,
      cancelRate,
      avgSatisfaction: avgSatisfaction?.dataValues.avg ? parseFloat(avgSatisfaction.dataValues.avg).toFixed(1) : 0,
      totalRevenue: totalRevenue || 0,
      pendingCallbackCount,
      pendingComplaintCount,
      pendingCount
    });
  } catch (error) {
    console.error('获取仪表盘数据失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取工单趋势
router.get('/order-trend', auth, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days) + 1);
    startDate.setHours(0, 0, 0, 0);

    const orders = await WorkOrder.findAll({
      attributes: [
        [fn('DATE', col('created_at')), 'date'],
        [fn('COUNT', literal('*')), 'count']
      ],
      where: { created_at: { [Op.gte]: startDate } },
      group: [fn('DATE', col('created_at'))],
      order: [[fn('DATE', col('created_at')), 'ASC']]
    });

    res.json(orders.map(o => ({
      date: o.dataValues.date,
      count: parseInt(o.dataValues.count)
    })));
  } catch (error) {
    console.error('获取工单趋势失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取维修类型分布
router.get('/category-distribution', auth, async (req, res) => {
  try {
    const categories = await WorkOrder.findAll({
      attributes: [
        'problem_category',
        [fn('COUNT', literal('*')), 'count']
      ],
      group: ['problem_category']
    });

    res.json(categories.map(c => ({
      category: c.dataValues.problem_category,
      count: parseInt(c.dataValues.count)
    })));
  } catch (error) {
    console.error('获取类型分布失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取区域分布
router.get('/area-distribution', auth, async (req, res) => {
  try {
    const areas = await WorkOrder.findAll({
      attributes: [
        'area',
        [fn('COUNT', literal('*')), 'count']
      ],
      where: { area: { [Op.not]: null, [Op.ne]: '' } },
      group: ['area']
    });

    res.json(areas.map(a => ({
      area: a.dataValues.area,
      count: parseInt(a.dataValues.count)
    })));
  } catch (error) {
    console.error('获取区域分布失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取区域详细统计（完成率、满意度、营收）
router.get('/area-stats', auth, async (req, res) => {
  try {
    // 1. Get area-level aggregated stats from WorkOrder directly
    const areaStats = await WorkOrder.findAll({
      attributes: [
        'area',
        [fn('COUNT', literal('*')), 'total'],
        [fn('SUM', literal("CASE WHEN status IN ('completed', 'callback') THEN 1 ELSE 0 END")), 'completed'],
        [fn('SUM', literal("CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END")), 'cancelled']
      ],
      where: { area: { [Op.not]: null, [Op.ne]: '' } },
      group: ['area']
    });

    // 2. Get revenue per area - simple join via raw order_id reference
    const areaRevenue = await Construction.findAll({
      attributes: [
        'order_id',
        'service_fee'
      ]
    });
    // Build a map of order_id -> order.area (need to fetch order areas first)
    const orderAreas = await WorkOrder.findAll({
      attributes: ['id', 'area'],
      where: { area: { [Op.not]: null, [Op.ne]: '' } }
    });
    const orderAreaMap = {};
    orderAreas.forEach(o => { orderAreaMap[o.id] = o.area; });
    // Sum revenue by area
    const revenueByArea = {};
    areaRevenue.forEach(c => {
      const area = orderAreaMap[c.order_id];
      if (area) {
        revenueByArea[area] = (revenueByArea[area] || 0) + (c.service_fee || 0);
      }
    });

    // 3. Get satisfaction per area from CallbackRecord
    const callbacks = await CallbackRecord.findAll({
      attributes: ['order_id', 'satisfaction_score'],
      where: { satisfaction_score: { [Op.not]: null } }
    });
    // Group satisfaction scores by area
    const satisfactionByArea = {};
    callbacks.forEach(cb => {
      const area = orderAreaMap[cb.order_id];
      if (area) {
        if (!satisfactionByArea[area]) satisfactionByArea[area] = [];
        satisfactionByArea[area].push(cb.satisfaction_score);
      }
    });

    // 4. Merge all data
    const result = areaStats.map(a => {
      const total = parseInt(a.dataValues.total) || 0;
      const completed = parseInt(a.dataValues.completed) || 0;
      const area = a.dataValues.area;
      const scores = satisfactionByArea[area] || [];
      const avgSat = scores.length > 0
        ? (scores.reduce((sum, s) => sum + s, 0) / scores.length).toFixed(1)
        : '-';
      return {
        area,
        total,
        completed,
        completionRate: total > 0 ? parseFloat((completed / total * 100).toFixed(1)) : 0,
        avgSatisfaction: avgSat,
        revenue: Math.round(revenueByArea[area] || 0)
      };
    });

    res.json(result);
  } catch (error) {
    console.error('获取区域统计失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取营收趋势 (GET /dashboard/revenue-trend)
router.get('/revenue-trend', auth, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days) + 1);
    startDate.setHours(0, 0, 0, 0);

    const revenues = await Construction.findAll({
      attributes: [
        [fn('DATE', col('created_at')), 'date'],
        [fn('SUM', col('service_fee')), 'revenue'],
        [fn('SUM', col('total_fee')), 'totalFee']
      ],
      where: { created_at: { [Op.gte]: startDate } },
      group: [fn('DATE', col('created_at'))],
      order: [[fn('DATE', col('created_at')), 'ASC']]
    });

    res.json(revenues.map(r => ({
      date: r.dataValues.date,
      revenue: parseFloat(r.dataValues.revenue) || 0,
      totalFee: parseFloat(r.dataValues.totalFee) || 0
    })));
  } catch (error) {
    console.error('获取营收趋势失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取师傅排行
router.get('/technician-ranking', auth, async (req, res) => {
  try {
    const technicians = await Technician.findAll({
      where: { status: 1 },
      include: [{
        model: Construction,
        as: 'constructions',
        required: false
      }]
    });

    // Batch query satisfaction scores for all technicians
    const techIds = technicians.map(t => t.id);

    // Get all Construction records for these technicians
    const techConstructions = await Construction.findAll({
      attributes: ['technician_id', 'order_id'],
      where: { technician_id: { [Op.in]: techIds } }
    });

    // Group order_ids by technician
    const techOrderMap = {};
    techConstructions.forEach(c => {
      if (!techOrderMap[c.technician_id]) techOrderMap[c.technician_id] = [];
      techOrderMap[c.technician_id].push(c.order_id);
    });

    // Get all callback records for these orders
    const allOrderIds = techConstructions.map(c => c.order_id);
    const orderAvgMap = {};
    if (allOrderIds.length > 0) {
      const callbackStats = await CallbackRecord.findAll({
        attributes: [
          'order_id',
          [fn('AVG', col('satisfaction_score')), 'avg']
        ],
        where: {
          order_id: { [Op.in]: allOrderIds },
          satisfaction_score: { [Op.not]: null }
        },
        group: ['order_id']
      });
      callbackStats.forEach(cs => {
        orderAvgMap[cs.dataValues.order_id] = parseFloat(cs.dataValues.avg).toFixed(1);
      });
    }

    const rankedTechs = technicians.map(tech => {
      const orderCount = tech.constructions ? tech.constructions.length : 0;
      const techOrderIds = techOrderMap[tech.id] || [];
      const scores = techOrderIds.map(oid => orderAvgMap[oid]).filter(s => s !== undefined);
      const avgSatisfaction = scores.length > 0
        ? (scores.reduce((a, b) => a + parseFloat(b), 0) / scores.length).toFixed(1)
        : '-';

      return {
        id: tech.id,
        name: tech.name,
        orderCount,
        avgSatisfaction,
        specialties: tech.specialties || []
      };
    });

    rankedTechs.sort((a, b) => b.orderCount - a.orderCount);

    res.json(rankedTechs.slice(0, 5));
  } catch (error) {
    console.error('获取师傅排行失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
