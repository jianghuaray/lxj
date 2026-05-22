const express = require('express');
const { Op, fn, col } = require('sequelize');
const { sequelize, WorkOrder, Technician, Construction } = require('../models');
const { auth } = require('../middleware/auth');
const { roundMoney } = require('../utils/shareCalculator');

const router = express.Router();

function normalizeStatusArray(statuses) {
  if (Array.isArray(statuses)) return statuses;
  if (typeof statuses === 'string') return statuses.split(',').map(s => s.trim()).filter(Boolean);
  return ['completed', 'callback'];
}

function buildFeeWhere(source = {}) {
  const {
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
    statuses
  } = source;

  const orderWhere = {
    status: { [Op.in]: normalizeStatusArray(statuses) }
  };

  if (startDate) {
    orderWhere.completed_at = { ...orderWhere.completed_at, [Op.gte]: new Date(startDate) };
  }
  if (endDate) {
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);
    orderWhere.completed_at = { ...orderWhere.completed_at, [Op.lte]: endOfDay };
  }
  if (area) orderWhere.area = area;
  if (problemCategory) orderWhere.problem_category = problemCategory;
  if (sourceChannel) orderWhere.source_channel = sourceChannel;
  if (sourceType) orderWhere.source_type = sourceType;
  if (sourcePropertyId) orderWhere.source_property_id = sourcePropertyId;
  if (sourceBuildingManagerId) orderWhere.source_building_manager_id = sourceBuildingManagerId;

  const constructionWhere = {};
  if (technicianId) constructionWhere.technician_id = technicianId;
  if (propertyId) constructionWhere.property_id = propertyId;
  if (buildingManagerId) constructionWhere.building_manager_id = buildingManagerId;

  return { orderWhere, constructionWhere };
}

function getSettlementFieldMap(type) {
  const maps = {
    technician: {
      targetField: 'technician_id',
      statusField: 'technician_settlement_status',
      amountField: 'technician_amount'
    },
    property: {
      targetField: 'property_id',
      statusField: 'property_settlement_status',
      amountField: 'property_amount'
    },
    building_manager: {
      targetField: 'building_manager_id',
      statusField: 'building_manager_settlement_status',
      amountField: 'building_manager_amount'
    }
  };
  return maps[type] || null;
}

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

    const { orderWhere, constructionWhere } = buildFeeWhere({
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
      statuses
    });

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
    const formatItem = order => {
      const o = order.toJSON();
      return {
        id: o.construction.id,
        orderId: o.id,
        orderNo: o.order_no,
        customerName: o.customer_name,
        sourceChannel: o.source_channel,
        technicianId: o.construction?.technician_id || null,
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
    };
    const items = rows.map(formatItem);

    const allRows = await WorkOrder.findAll({
      where: orderWhere,
      include: [
        {
          model: Construction,
          as: 'construction',
          where: constructionWhere,
          required: true,
          include: [
            { model: Technician, as: 'technician', attributes: ['id', 'name'] }
          ]
        }
      ],
      order: [['completed_at', 'DESC']]
    });
    const allItems = allRows.map(formatItem);

    function addSettlementGroup(map, key, payload) {
      if (!key || payload.amount <= 0) return;
      const current = map.get(key) || {
        id: key,
        name: payload.name || '未命名',
        type: payload.type,
        orderCount: 0,
        payableAmount: 0,
        settledAmount: 0,
        unsettledAmount: 0
      };
      current.orderCount += 1;
      current.payableAmount += payload.amount;
      if (payload.status === 'settled') {
        current.settledAmount += payload.amount;
      } else {
        current.unsettledAmount += payload.amount;
      }
      map.set(key, current);
    }

    const technicianGroups = new Map();
    const propertyGroups = new Map();
    const buildingManagerGroups = new Map();
    allItems.forEach(item => {
      addSettlementGroup(technicianGroups, item.technicianId, {
        type: 'technician',
        name: item.technicianName,
        amount: item.technicianAmount,
        status: item.technicianSettlementStatus
      });
      addSettlementGroup(propertyGroups, item.propertyId, {
        type: 'property',
        name: item.propertyName,
        amount: item.propertyAmount,
        status: item.propertySettlementStatus
      });
      addSettlementGroup(buildingManagerGroups, item.buildingManagerId, {
        type: 'building_manager',
        name: item.buildingManagerName,
        amount: item.buildingManagerAmount,
        status: item.buildingManagerSettlementStatus
      });
    });

    const normalizeGroups = map => Array.from(map.values())
      .map(item => ({
        ...item,
        payableAmount: roundMoney(item.payableAmount),
        settledAmount: roundMoney(item.settledAmount),
        unsettledAmount: roundMoney(item.unsettledAmount),
        status: item.unsettledAmount <= 0 ? 'settled' : (item.settledAmount > 0 ? 'partial' : 'unsettled')
      }))
      .sort((a, b) => b.unsettledAmount - a.unsettledAmount || b.payableAmount - a.payableAmount);

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
      },
      settlementGroups: {
        technicians: normalizeGroups(technicianGroups),
        properties: normalizeGroups(propertyGroups),
        buildingManagers: normalizeGroups(buildingManagerGroups)
      }
    });
  } catch (error) {
    console.error('获取费用数据失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 按当前对账筛选条件批量更新某个结算对象的结算状态
router.post('/fees/settle', auth, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      type,
      targetId,
      status = 'settled',
      filters = {},
      constructionIds = []
    } = req.body;

    const fieldMap = getSettlementFieldMap(type);
    if (!fieldMap) {
      await transaction.rollback();
      return res.status(400).json({ error: '结算对象类型不正确' });
    }
    if (!['unsettled', 'settled'].includes(status)) {
      await transaction.rollback();
      return res.status(400).json({ error: '结算状态不正确' });
    }
    if (!targetId) {
      await transaction.rollback();
      return res.status(400).json({ error: '请选择结算对象' });
    }

    const { orderWhere, constructionWhere } = buildFeeWhere(filters);
    constructionWhere[fieldMap.targetField] = targetId;
    constructionWhere[fieldMap.statusField] = { [Op.ne]: status };

    if (Array.isArray(constructionIds) && constructionIds.length > 0) {
      constructionWhere.id = { [Op.in]: constructionIds };
    }

    const rows = await Construction.findAll({
      where: constructionWhere,
      include: [
        {
          model: WorkOrder,
          as: 'order',
          where: orderWhere,
          required: true,
          attributes: ['id']
        }
      ],
      attributes: ['id', fieldMap.amountField],
      transaction
    });

    const updateIds = rows
      .filter(item => Number(item[fieldMap.amountField]) > 0)
      .map(item => item.id);

    if (updateIds.length > 0) {
      await Construction.update(
        { [fieldMap.statusField]: status },
        { where: { id: { [Op.in]: updateIds } }, transaction }
      );
    }

    await transaction.commit();
    res.json({
      message: '结算状态已更新',
      updatedCount: updateIds.length
    });
  } catch (error) {
    await transaction.rollback();
    console.error('批量更新结算状态失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
