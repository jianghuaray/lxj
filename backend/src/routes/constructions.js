const express = require('express');
const { Op, fn, col, literal } = require('sequelize');
const { WorkOrder, Customer, Technician, Construction } = require('../models');
const { auth } = require('../middleware/auth');

const router = express.Router();

// 获取费用汇总列表
router.get('/fees', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      pageSize = 20, 
      startDate, 
      endDate, 
      technicianId, 
      area, 
      problemCategory,
      statuses = ['completed', 'callback']
    } = req.query;

    // Build where clause for work orders
    const orderWhere = {};
    
    // Filter by status - default to completed and callback
    let statusArray;
    if (Array.isArray(statuses)) {
      statusArray = statuses;
    } else if (typeof statuses === 'string') {
      statusArray = statuses.split(',').map(s => s.trim());
    } else {
      statusArray = ['completed', 'callback'];
    }
    orderWhere.status = { [Op.in]: statusArray };
    
    // Filter by date range (completed_at)
    if (startDate) {
      orderWhere.completed_at = { ...orderWhere.completed_at, [Op.gte]: new Date(startDate) };
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      orderWhere.completed_at = { ...orderWhere.completed_at, [Op.lte]: endOfDay };
    }
    
    // Filter by area
    if (area) {
      orderWhere.area = area;
    }
    
    // Filter by problem category
    if (problemCategory) {
      orderWhere.problem_category = problemCategory;
    }

    // Filter by technician
    let technicianWhere = {};
    if (technicianId) {
      technicianWhere = { technician_id: technicianId };
    }

    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    // Get paginated results
    const { count, rows } = await WorkOrder.findAndCountAll({
      where: orderWhere,
      include: [
        { 
          model: Construction, 
          as: 'construction',
          where: technicianWhere,
          required: true, // Inner join - only orders with construction
          include: [
            { model: Technician, as: 'technician', attributes: ['id', 'name'] }
          ]
        }
      ],
      order: [['completed_at', 'DESC']],
      limit: parseInt(pageSize),
      offset
    });

    // Format items for frontend
    const items = rows.map(order => {
      const o = order.toJSON();
      return {
        id: o.construction.id,
        orderId: o.id,
        orderNo: o.order_no,
        customerName: o.customer_name,
        technicianName: o.construction?.technician?.name || null,
        problemCategory: o.problem_category,
        totalFee: o.construction?.total_fee || 0,
        serviceFee: o.construction?.service_fee || 0,
        receivedFee: o.construction?.received_fee || 0,
        materialCost: o.construction?.material_cost || 0,
        buildingManagerIncentive: o.construction?.building_manager_incentive || 0,
        completedAt: o.completed_at
      };
    });

    // Calculate summary for the current filters
    const summaryResult = await WorkOrder.findAll({
      where: orderWhere,
      include: [
        {
          model: Construction,
          as: 'construction',
          where: technicianWhere,
          required: true
        }
      ],
      attributes: [
        [fn('SUM', col('construction.total_fee')), 'totalFee'],
        [fn('SUM', col('construction.service_fee')), 'serviceFee'],
        [fn('SUM', col('construction.received_fee')), 'receivedFee'],
        [fn('SUM', col('construction.material_cost')), 'materialCost'],
        [fn('SUM', col('construction.building_manager_incentive')), 'incentive']
      ],
      raw: true
    });

    const summaryData = summaryResult[0] || {};
    const totalFee = parseFloat(summaryData.totalFee) || 0;
    const serviceFee = parseFloat(summaryData.serviceFee) || 0;
    const receivedFee = parseFloat(summaryData.receivedFee) || 0;
    const materialCost = parseFloat(summaryData.materialCost) || 0;
    const incentive = parseFloat(summaryData.incentive) || 0;

    res.json({
      items,
      total: count,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      summary: {
        totalFee,
        serviceFee,
        receivedFee,
        feeDifference: serviceFee - receivedFee,
        materialCost,
        incentive,
        profit: receivedFee - incentive
      }
    });
  } catch (error) {
    console.error('获取费用数据失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
