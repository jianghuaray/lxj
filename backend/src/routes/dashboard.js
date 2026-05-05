const express = require('express');
const { Op, fn, col, literal } = require('sequelize');
const {
  sequelize,
  WorkOrder,
  Construction,
  CallbackRecord,
  Technician,
  Customer,
  Volunteer,
  VolunteerService
} = require('../models');
const { auth } = require('../middleware/auth');

const router = express.Router();

// 获取仪表盘统计数据 — 合并查询优化（8次→6次）
router.get('/', auth, async (req, res) => {
  try {
    const { timeRange } = req.query;

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

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Batch independent queries with Promise.all
    const [
      statusCounts,
      avgSatisfaction,
      totalRevenue,
      todayOrders,
      pendingCallbackCount,
      pendingCount,
      volunteerCount,
      volunteerServices
    ] = await Promise.all([
      // Single grouped query replaces 3 separate count queries
      WorkOrder.findAll({
        attributes: ['status', [fn('COUNT', literal('*')), 'count']],
        where: { created_at: { [Op.gte]: startDate } },
        group: ['status'],
        raw: true
      }),
      CallbackRecord.findOne({
        attributes: [[fn('AVG', col('satisfaction_score')), 'avg']],
        where: {
          satisfaction_score: { [Op.not]: null },
          callback_at: { [Op.gte]: startDate }
        },
        raw: true
      }),
      Construction.sum('service_fee', {
        where: { created_at: { [Op.gte]: startDate } }
      }),
      WorkOrder.count({ where: { created_at: { [Op.gte]: todayStart } } }),
      WorkOrder.count({ where: { status: 'completed' } }),
      WorkOrder.count({ where: { status: 'pending' } }),
      Volunteer.count(),
      VolunteerService.findAll({ attributes: ['serviceDuration'] })
    ]);

    // Compute derived stats from single statusCounts query
    const statusMap = {};
    statusCounts.forEach(r => { statusMap[r.status] = parseInt(r.count); });
    const totalOrders = statusCounts.reduce((sum, r) => sum + parseInt(r.count), 0);
    const completedOrders = (statusMap['completed'] || 0) + (statusMap['callback'] || 0);
    const cancelledOrders = statusMap['cancelled'] || 0;
    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders * 100).toFixed(1) : 0;
    const cancelRate = totalOrders > 0 ? (cancelledOrders / totalOrders * 100).toFixed(1) : 0;

    // Calculate total volunteer service hours (parse duration strings)
    let totalServiceHours = 0;
    (volunteerServices || []).forEach(s => {
      const d = s.serviceDuration || '';
      const hourMatch = d.match(/(\d+)\s*小时/);
      if (hourMatch) totalServiceHours += parseInt(hourMatch[1]);
      else {
        const numMatch = d.match(/^(\d+)/);
        if (numMatch) totalServiceHours += parseInt(numMatch[1]);
        else if (d.includes('半天')) totalServiceHours += 4;
        else if (d.includes('天')) {
          const dayMatch = d.match(/(\d+)\s*天/);
          totalServiceHours += (dayMatch ? parseInt(dayMatch[1]) : 1) * 8;
        }
      }
    });

    res.json({
      totalOrders,
      todayOrders,
      completionRate,
      cancelRate,
      avgSatisfaction: avgSatisfaction?.avg ? parseFloat(avgSatisfaction.avg).toFixed(1) : 0,
      totalRevenue: totalRevenue || 0,
      pendingCallbackCount,
      pendingCount,
      volunteerCount,
      serviceHours: totalServiceHours
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

// 获取区域详细统计（完成率、满意度、营收）— 合并查询优化
router.get('/area-stats', auth, async (req, res) => {
  try {
    // 1. Area-level aggregated stats from WorkOrder
    const areaStats = await WorkOrder.findAll({
      attributes: [
        'area',
        [fn('COUNT', literal('*')), 'total'],
        [fn('SUM', literal("CASE WHEN status IN ('completed', 'callback') THEN 1 ELSE 0 END")), 'completed'],
        [fn('SUM', literal("CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END")), 'cancelled']
      ],
      where: { area: { [Op.not]: null, [Op.ne]: '' } },
      group: ['area'],
      raw: true
    });

    // 2. Revenue per area — single JOIN query (replaces 2 separate queries)
    const revenueByArea = await Construction.findAll({
      attributes: [
        [col('order.area'), 'area'],
        [fn('SUM', col('service_fee')), 'revenue']
      ],
      include: [{
        model: WorkOrder,
        as: 'order',
        attributes: [],
        where: { area: { [Op.not]: null, [Op.ne]: '' } }
      }],
      group: [col('order.area')],
      raw: true
    });
    const revenueMap = {};
    revenueByArea.forEach(r => { revenueMap[r['order.area']] = parseFloat(r.revenue) || 0; });

    // 3. Satisfaction per area — single JOIN query (replaces 2 separate queries + in-memory aggregation)
    const satisfactionByArea = await CallbackRecord.findAll({
      attributes: [
        [col('order.area'), 'area'],
        [fn('AVG', col('satisfaction_score')), 'avg']
      ],
      include: [{
        model: WorkOrder,
        as: 'order',
        attributes: [],
        where: { area: { [Op.not]: null, [Op.ne]: '' } }
      }],
      where: { satisfaction_score: { [Op.not]: null } },
      group: [col('order.area')],
      raw: true
    });
    const satisfactionMap = {};
    satisfactionByArea.forEach(r => {
      satisfactionMap[r['order.area']] = parseFloat(r.avg).toFixed(1);
    });

    // Merge all data — 3 queries total instead of the original 5
    const result = areaStats.map(a => {
      const total = parseInt(a.total) || 0;
      const completed = parseInt(a.completed) || 0;
      const area = a.area;
      return {
        area,
        total,
        completed,
        completionRate: total > 0 ? parseFloat((completed / total * 100).toFixed(1)) : 0,
        avgSatisfaction: satisfactionMap[area] || '-',
        revenue: Math.round(revenueMap[area] || 0)
      };
    });

    res.json(result);
  } catch (error) {
    console.error('获取区域统计失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取营收趋势
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

    const techIds = technicians.map(t => t.id);

    const techConstructions = await Construction.findAll({
      attributes: ['technician_id', 'order_id'],
      where: { technician_id: { [Op.in]: techIds } }
    });

    const techOrderMap = {};
    techConstructions.forEach(c => {
      if (!techOrderMap[c.technician_id]) techOrderMap[c.technician_id] = [];
      techOrderMap[c.technician_id].push(c.order_id);
    });

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
