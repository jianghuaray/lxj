const express = require('express');
const { Op, fn, col } = require('sequelize');
const { WorkOrder, Technician, Construction } = require('../models');
const { auth } = require('../middleware/auth');
const { roundMoney } = require('../utils/shareCalculator');

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
      sourceChannel,
      sourceType,
      sourcePropertyId,
      sourceBuildingManagerId,
      propertyId,
      buildingManagerId,
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
    if (sourceChannel) {
      orderWhere.source_channel = sourceChannel;
    }
    if (sourceType) {
      orderWhere.source_type = sourceType;
    }
    if (sourcePropertyId) {
      orderWhere.source_property_id = sourcePropertyId;
    }
    if (sourceBuildingManagerId) {
      orderWhere.source_building_manager_id = sourceBuildingManagerId;
    }

    const constructionWhere = {};
    if (technicianId) {
      constructionWhere.technician_id = technicianId;
    }
    if (propertyId) {
      constructionWhere.property_id = propertyId;
    }
    if (buildingManagerId) {
      constructionWhere.building_manager_id = buildingManagerId;
    }

    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    // Get paginated results
    const { count, rows } = await WorkOrder.findAndCountAll({
      where: orderWhere,
      include: [
        { 
          model: Construction, 
          as: 'construction',
          where: constructionWhere,
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
        sourceChannel: o.source_channel,
        technicianName: o.construction?.technician?.name || null,
        propertyId: o.construction?.property_id || null,
        propertyName: o.construction?.property_name || null,
        buildingManagerId: o.construction?.building_manager_id || null,
        buildingManagerName: o.construction?.building_manager_name || null,
        problemCategory: o.problem_category,
        orderAmount: Number(o.construction?.order_amount ?? o.construction?.total_fee) || 0,
        shareBaseAmount: Number(o.construction?.share_base_amount) || 0,
        technicianRate: Number(o.construction?.technician_rate ?? o.construction?.commission_rate) || 0,
        technicianAmount: Number(o.construction?.technician_amount ?? o.construction?.service_fee) || 0,
        propertyRate: Number(o.construction?.property_rate) || 0,
        propertyAmount: Number(o.construction?.property_amount) || 0,
        buildingManagerRate: Number(o.construction?.building_manager_rate) || 0,
        buildingManagerAmount: Number(o.construction?.building_manager_amount ?? o.construction?.building_manager_incentive) || 0,
        companyAmount: Number(o.construction?.company_amount) || 0,
        collectionParty: o.construction?.collection_party || 'technician',
        technicianSettlementStatus: o.construction?.technician_settlement_status || 'unsettled',
        propertySettlementStatus: o.construction?.property_settlement_status || 'unsettled',
        buildingManagerSettlementStatus: o.construction?.building_manager_settlement_status || 'unsettled',
        receivedAmount: Number(o.construction?.received_amount ?? o.construction?.received_fee) || 0,
        materialCost: o.construction?.material_cost || 0,
        totalFee: Number(o.construction?.order_amount ?? o.construction?.total_fee) || 0,
        receivedFee: Number(o.construction?.received_amount ?? o.construction?.received_fee) || 0,
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
          where: constructionWhere,
          required: true
        }
      ],
      attributes: [
        [fn('SUM', col('construction.order_amount')), 'orderAmount'],
        [fn('SUM', col('construction.share_base_amount')), 'shareBaseAmount'],
        [fn('SUM', col('construction.technician_amount')), 'technicianAmount'],
        [fn('SUM', col('construction.property_amount')), 'propertyAmount'],
        [fn('SUM', col('construction.building_manager_amount')), 'buildingManagerAmount'],
        [fn('SUM', col('construction.company_amount')), 'companyAmount'],
        [fn('SUM', col('construction.received_amount')), 'receivedAmount'],
        [fn('SUM', col('construction.material_cost')), 'materialCost'],
      ],
      raw: true
    });

    const summaryData = summaryResult[0] || {};
    const orderAmount = parseFloat(summaryData.orderAmount) || 0;
    const shareBaseAmount = parseFloat(summaryData.shareBaseAmount) || 0;
    const technicianAmount = parseFloat(summaryData.technicianAmount) || 0;
    const propertyAmount = parseFloat(summaryData.propertyAmount) || 0;
    const buildingManagerAmount = parseFloat(summaryData.buildingManagerAmount) || 0;
    const companyAmount = parseFloat(summaryData.companyAmount) || 0;
    const receivedAmount = parseFloat(summaryData.receivedAmount) || 0;
    const materialCost = parseFloat(summaryData.materialCost) || 0;

    res.json({
      items,
      total: count,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      summary: {
        orderAmount: roundMoney(orderAmount),
        shareBaseAmount: roundMoney(shareBaseAmount),
        technicianAmount: roundMoney(technicianAmount),
        propertyAmount: roundMoney(propertyAmount),
        buildingManagerAmount: roundMoney(buildingManagerAmount),
        companyAmount: roundMoney(companyAmount),
        receivedAmount: roundMoney(receivedAmount),
        materialCost: roundMoney(materialCost),
        collectionDifference: roundMoney(orderAmount - receivedAmount),
        totalFee: roundMoney(orderAmount),
        receivedFee: roundMoney(receivedAmount)
      }
    });
  } catch (error) {
    console.error('获取费用数据失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
