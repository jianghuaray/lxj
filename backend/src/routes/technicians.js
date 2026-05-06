const express = require('express');
const { Op, fn, col, literal } = require('sequelize');
const { Technician, Construction, WorkOrder, CallbackRecord, sequelize } = require('../models');
const { auth } = require('../middleware/auth');
const { escapeLike, validateLength } = require('../utils/sanitize');

const router = express.Router();

// 批量计算师傅统计（orderCount / avgSatisfaction / totalRevenue）
async function computeTechStats(techIds, monthStart, monthEnd) {
  const orderCountMap = {};
  const totalRevenueMap = {};
  const avgSatisfactionMap = {};

  if (techIds.length === 0) return { orderCountMap, avgSatisfactionMap, totalRevenueMap };

  // 1. orderCount + totalRevenue（当月）
  const orderCounts = await Construction.findAll({
    attributes: [
      'technician_id',
      [fn('COUNT', literal('*')), 'orderCount'],
      [fn('COALESCE', fn('SUM', col('total_fee')), 0), 'totalRevenue']
    ],
    where: {
      technician_id: { [Op.in]: techIds },
      created_at: { [Op.gte]: monthStart, [Op.lt]: monthEnd }
    },
    group: ['technician_id']
  });
  orderCounts.forEach(oc => {
    orderCountMap[oc.dataValues.technician_id] = parseInt(oc.dataValues.orderCount);
    totalRevenueMap[oc.dataValues.technician_id] = parseFloat(oc.dataValues.totalRevenue) || 0;
  });

  // 2. avgSatisfaction：一条 SQL JOIN 直接算出每个 technician 的平均分
  const avgSql = `
    SELECT c.technician_id, AVG(cr.satisfaction_score) as avg_score
    FROM constructions c
    INNER JOIN callback_records cr ON c.order_id = cr.order_id
    WHERE c.technician_id IN (${techIds.map(() => '?').join(',')})
      AND cr.satisfaction_score IS NOT NULL
    GROUP BY c.technician_id
  `;
  const avgRows = await sequelize.query(avgSql, {
    replacements: techIds,
    type: sequelize.QueryTypes.SELECT
  });
  avgRows.forEach(r => {
    avgSatisfactionMap[r.technician_id] = parseFloat(r.avg_score).toFixed(1);
  });

  return { orderCountMap, avgSatisfactionMap, totalRevenueMap };
}

// 获取师傅列表
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword, status, specialty, sort } = req.query;

    const where = {};
    if (status !== undefined && status !== '') {
      const parsedStatus = Number(status);
      if (!Number.isNaN(parsedStatus)) {
        where.status = parsedStatus;
      }
    }
    if (keyword) {
      const safeKeyword = escapeLike(keyword);
      where[Op.or] = [
        { name: { [Op.like]: `%${safeKeyword}%` } },
        { phone: { [Op.like]: `%${safeKeyword}%` } }
      ];
    }
    if (specialty) {
      // SQLite JSON query - specialties stored as JSON array (escape LIKE wildcards)
      const safeSpecialty = escapeLike(specialty);
      where.specialties = { [Op.like]: `%${safeSpecialty}%` };
    }

    // Compute current month range for revenue
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // If sorting by computed fields, fetch all matching records and sort in JS
    const sortField = sort ? sort.split('_')[0] : ''; // orderCount, avgSatisfaction, totalRevenue
    const sortDir = sort ? (sort.endsWith('_asc') ? 'ASC' : 'DESC') : 'DESC';
    const needsPostSort = ['orderCount', 'avgSatisfaction', 'totalRevenue'].includes(sortField);

    // For post-sort, fetch without pagination first to compute stats, then paginate after sort
    let items, total;

    if (needsPostSort) {
      // Fetch all matching technicians (no pagination)
      const allRows = await Technician.findAll({ where });

      const techIds = allRows.map(t => t.id);
      const { orderCountMap, avgSatisfactionMap, totalRevenueMap } =
        await computeTechStats(techIds, monthStart, monthEnd);

      // Merge stats and sort
      const merged = allRows.map(tech => {
        const t = tech.toJSON();
        return {
          ...t,
          orderCount: orderCountMap[t.id] || 0,
          avgSatisfaction: avgSatisfactionMap[t.id] || '-',
          totalRevenue: totalRevenueMap[t.id] || 0
        };
      });

      // Sort by computed field
      merged.sort((a, b) => {
        let valA, valB;
        if (sortField === 'orderCount') {
          valA = a.orderCount; valB = b.orderCount;
        } else if (sortField === 'avgSatisfaction') {
          valA = a.avgSatisfaction === '-' ? 0 : parseFloat(a.avgSatisfaction);
          valB = b.avgSatisfaction === '-' ? 0 : parseFloat(b.avgSatisfaction);
        } else if (sortField === 'totalRevenue') {
          valA = a.totalRevenue; valB = b.totalRevenue;
        }
        return sortDir === 'DESC' ? valB - valA : valA - valB;
      });

      total = merged.length;
      const offset = (parseInt(page) - 1) * parseInt(pageSize);
      items = merged.slice(offset, offset + parseInt(pageSize));
    } else {
      // Default: DB-level sort by created_at
      const offset = (parseInt(page) - 1) * parseInt(pageSize);

      const { count, rows } = await Technician.findAndCountAll({
        where,
        order: [['created_at', 'DESC']],
        limit: parseInt(pageSize),
        offset
      });

      const techIds = rows.map(t => t.id);
      const { orderCountMap, avgSatisfactionMap, totalRevenueMap } =
        await computeTechStats(techIds, monthStart, monthEnd);

      total = count;
      items = rows.map(tech => {
        const t = tech.toJSON();
        return {
          ...t,
          orderCount: orderCountMap[t.id] || 0,
          avgSatisfaction: avgSatisfactionMap[t.id] || '-',
          totalRevenue: totalRevenueMap[t.id] || 0
        };
      });
    }

    res.json({
      items,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (error) {
    console.error('获取师傅列表失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取师傅详情
router.get('/:id', auth, async (req, res) => {
  try {
    const technician = await Technician.findByPk(req.params.id, {
      include: [
        {
          model: Construction,
          as: 'constructions',
          include: [{ model: WorkOrder, as: 'order' }],
          order: [['created_at', 'DESC']],
          limit: 20
        }
      ]
    });

    if (!technician) {
      return res.status(404).json({ error: '师傅不存在' });
    }

    res.json(technician);
  } catch (error) {
    console.error('获取师傅详情失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取师傅月度结算数据 (GET /technicians/:id/settlement)
router.get('/:id/settlement', auth, async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) {
      return res.status(400).json({ error: '请提供月份参数' });
    }

    const technician = await Technician.findByPk(req.params.id);
    if (!technician) {
      return res.status(404).json({ error: '师傅不存在' });
    }

    // Parse month (format: 2026-05)
    const [year, mon] = month.split('-').map(Number);
    const startDate = new Date(year, mon - 1, 1);
    const endDate = new Date(year, mon, 1);

    // Get all constructions for this technician in the given month
    const constructions = await Construction.findAll({
      where: {
        technician_id: req.params.id,
        created_at: {
          [Op.gte]: startDate,
          [Op.lt]: endDate
        }
      },
      include: [{ model: WorkOrder, as: 'order' }]
    });

    const orderCount = constructions.length;
    const totalFee = constructions.reduce((sum, c) => sum + (c.total_fee || 0), 0);
    const serviceFee = constructions.reduce((sum, c) => sum + (c.service_fee || 0), 0);
    const materialCost = constructions.reduce((sum, c) => sum + (c.material_cost || 0), 0);
    const commissionRate = technician.commission_rate || 0.3;
    const technicianFee = totalFee - serviceFee - materialCost;

    res.json({
      orderCount,
      totalFee: Math.round(totalFee * 100) / 100,
      serviceFee: Math.round(serviceFee * 100) / 100,
      materialCost: Math.round(materialCost * 100) / 100,
      commissionRate,
      technicianFee: Math.round(technicianFee * 100) / 100,
      month
    });
  } catch (error) {
    console.error('获取结算数据失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 导出结算单 (GET /technicians/:id/settlement/export)
router.get('/:id/settlement/export', auth, async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) {
      return res.status(400).json({ error: '请提供月份参数' });
    }

    const technician = await Technician.findByPk(req.params.id);
    if (!technician) {
      return res.status(404).json({ error: '师傅不存在' });
    }

    // Return JSON data - frontend can convert to Excel
    const [year, mon] = month.split('-').map(Number);
    const startDate = new Date(year, mon - 1, 1);
    const endDate = new Date(year, mon, 1);

    const constructions = await Construction.findAll({
      where: {
        technician_id: req.params.id,
        created_at: {
          [Op.gte]: startDate,
          [Op.lt]: endDate
        }
      },
      include: [{ model: WorkOrder, as: 'order' }]
    });

    const orderCount = constructions.length;
    const totalFee = constructions.reduce((sum, c) => sum + (c.total_fee || 0), 0);
    const serviceFee = constructions.reduce((sum, c) => sum + (c.service_fee || 0), 0);
    const materialCost = constructions.reduce((sum, c) => sum + (c.material_cost || 0), 0);
    const technicianFee = totalFee - serviceFee - materialCost;

    const exportData = {
      technician: technician.name,
      phone: technician.phone,
      month,
      generatedAt: new Date().toISOString(),
      summary: {
        orderCount,
        totalFee,
        serviceFee,
        materialCost,
        technicianFee
      },
      details: constructions.map(c => ({
        orderNo: c.order?.order_no || '-',
        totalFee: c.total_fee,
        serviceFee: c.service_fee,
        materialCost: c.material_cost,
        completedAt: c.order?.completed_at
      }))
    };

    // Return as downloadable JSON (for now - can be enhanced to generate real xlsx)
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=settlement_${technician.name}_${month}.json`);
    res.json(exportData);
  } catch (error) {
    console.error('导出结算单失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 创建师傅
router.post('/', auth, async (req, res) => {
  try {
    const {
      name, phone, specialties, commissionRate, remark } = req.body;

    // Input validation
    if (!name || !name.trim()) return res.status(400).json({ error: '师傅姓名不能为空' });
    if (!phone) return res.status(400).json({ error: '手机号不能为空' });
    const nameLenCheck = validateLength(name, '姓名', 50);
    if (!nameLenCheck.valid) return res.status(400).json({ error: nameLenCheck.error });

    // Check if phone exists
    const existingTech = await Technician.findOne({ where: { phone } });
    if (existingTech) {
      return res.status(400).json({ error: '该手机号已存在' });
    }

    // Normalize commission rate: frontend may send 30 (meaning 30%), convert to 0.3
    const normalizedRate = commissionRate
      ? (commissionRate > 1 ? commissionRate / 100 : commissionRate)
      : 0.3;

    const technician = await Technician.create({
      name,
      phone,
      specialties: specialties || [],
      commission_rate: normalizedRate,
      status: 1,
      remark
    });

    res.status(201).json(technician);
  } catch (error) {
    console.error('创建师傅失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新师傅 (PUT /technicians/:id - also support PATCH)
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      name, phone, specialties, commissionRate, status, remark } = req.body;

    const technician = await Technician.findByPk(req.params.id);
    if (!technician) {
      return res.status(404).json({ error: '师傅不存在' });
    }

    if (phone && phone !== technician.phone) {
      const existingTech = await Technician.findOne({ where: { phone } });
      if (existingTech) {
        return res.status(400).json({ error: '该手机号已存在' });
      }
    }

    // Normalize commission rate
    let normalizedRate = commissionRate;
    if (commissionRate !== undefined) {
      normalizedRate = (commissionRate > 1 ? commissionRate / 100 : commissionRate);
    }

    await technician.update({
      name,
      phone,
      specialties,
      commission_rate: normalizedRate,
      status,
      remark
    });

    res.json({ message: '更新成功' });
  } catch (error) {
    console.error('更新师傅失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// PATCH support for partial updates
router.patch('/:id', auth, async (req, res) => {
  try {
    const technician = await Technician.findByPk(req.params.id);
    if (!technician) {
      return res.status(404).json({ error: '师傅不存在' });
    }

    const { name, phone, specialties, commissionRate, status, remark } = req.body;

    if (phone && phone !== technician.phone) {
      const existingTech = await Technician.findOne({ where: { phone } });
      if (existingTech) {
        return res.status(400).json({ error: '该手机号已存在' });
      }
    }

    // Normalize commission rate if provided
    let normalizedRate = commissionRate;
    if (commissionRate !== undefined) {
      normalizedRate = (commissionRate > 1 ? commissionRate / 100 : commissionRate);
    }

    await technician.update({
      ...(name !== undefined && { name }),
      ...(phone !== undefined && { phone }),
      ...(specialties !== undefined && { specialties }),
      ...(commissionRate !== undefined && { commission_rate: normalizedRate }),
      ...(status !== undefined && { status }),
      ...(remark !== undefined && { remark })
    });

    res.json({ message: '更新成功' });
  } catch (error) {
    console.error('更新师傅失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 删除师傅
router.delete('/:id', auth, async (req, res) => {
  try {
    const technician = await Technician.findByPk(req.params.id);
    if (!technician) {
      return res.status(404).json({ error: '师傅不存在' });
    }

    // Check if technician has dispatched (已派单) constructions — those block deletion
    const dispatchedCount = await Construction.count({
      include: [{
        model: WorkOrder,
        as: 'order',
        where: { status: 'dispatched' },
        required: true
      }],
      where: { technician_id: req.params.id }
    });
    if (dispatchedCount > 0) {
      return res.status(400).json({ error: `无法删除：该师傅有 ${dispatchedCount} 条已派单工单，请先完成或取消相关工单` });
    }

    // Delete non-dispatched constructions to release FK constraint
    await Construction.destroy({
      where: { technician_id: req.params.id }
    });

    await technician.destroy();
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除师傅失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
