const express = require('express');
const { Op, fn, col, literal } = require('sequelize');
const { Technician, Construction, WorkOrder, CallbackRecord } = require('../models');
const { auth } = require('../middleware/auth');
const { escapeLike, validatePhone, validateLength } = require('../utils/sanitize');

const router = express.Router();

// 获取师傅列表
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword, status, specialty } = req.query;

    const where = {};
    if (status !== undefined && status !== '') {
      const parsedStatus = parseInt(status);
      if (!isNaN(parsedStatus)) {
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

    const offset = (page - 1) * pageSize;

    const { count, rows } = await Technician.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(pageSize),
      offset
    });

    // Batch compute order counts and avg satisfaction - single query each
    const techIds = rows.map(t => t.id);

    let orderCountMap = {};
    let avgSatisfactionMap = {};

    if (techIds.length > 0) {
      // Batch order count by technician_id
      const orderCounts = await Construction.findAll({
        attributes: [
          'technician_id',
          [fn('COUNT', literal('*')), 'orderCount']
        ],
        where: { technician_id: { [Op.in]: techIds } },
        group: ['technician_id']
      });
      orderCounts.forEach(oc => {
        orderCountMap[oc.dataValues.technician_id] = parseInt(oc.dataValues.orderCount);
      });

      // Batch avg satisfaction: get order_ids per technician from Construction,
      // then query CallbackRecord for those order_ids
      const techOrderIds = await Construction.findAll({
        attributes: ['technician_id', 'order_id'],
        where: { technician_id: { [Op.in]: techIds } }
      });
      // Group order_ids by technician
      const techOrderMap = {};
      techOrderIds.forEach(r => {
        if (!techOrderMap[r.technician_id]) techOrderMap[r.technician_id] = [];
        techOrderMap[r.technician_id].push(r.order_id);
      });
      // Collect all order_ids that have callbacks
      const allOrderIds = techOrderIds.map(r => r.order_id);
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
        // Map order_id -> avg score
        const orderAvgMap = {};
        callbackStats.forEach(cs => {
          orderAvgMap[cs.dataValues.order_id] = parseFloat(cs.dataValues.avg).toFixed(1);
        });
        // Aggregate per technician: average of their orders' avg scores
        for (const [techId, orderIds] of Object.entries(techOrderMap)) {
          const scores = orderIds.map(oid => orderAvgMap[oid]).filter(s => s !== undefined);
          if (scores.length > 0) {
            avgSatisfactionMap[techId] = (scores.reduce((a, b) => a + parseFloat(b), 0) / scores.length).toFixed(1);
          }
        }
      }
    }

    // Merge computed fields into items
    const items = rows.map(tech => {
      const t = tech.toJSON();
      return {
        ...t,
        orderCount: orderCountMap[t.id] || 0,
        avgSatisfaction: avgSatisfactionMap[t.id] || '-'
      };
    });

    res.json({
      items,
      total: count,
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
    const phoneCheck = validatePhone(phone);
    if (!phoneCheck.valid) return res.status(400).json({ error: phoneCheck.error });
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

    await technician.update({ status: 0 });
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除师傅失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
