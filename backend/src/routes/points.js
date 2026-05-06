const express = require('express');
const router = express.Router();
const { Customer, PointRecord, Settings, sequelize } = require('../models');
const { auth } = require('../middleware/auth');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword, community, pointRange } = req.query;
    
    let whereClause = {};
    
    if (keyword) {
      whereClause[sequelize.Op.or] = [
        { name: { [sequelize.Op.like]: `%${keyword}%` } },
        { phone: { [sequelize.Op.like]: `%${keyword}%` } }
      ];
    }
    
    if (community) {
      whereClause.area = community;
    }
    
    if (pointRange) {
      if (pointRange === '500+') {
        whereClause.current_points = { [sequelize.Op.gt]: 500 };
      } else if (pointRange === '1000+') {
        whereClause.current_points = { [sequelize.Op.gt]: 1000 };
      } else if (pointRange === 'negative') {
        whereClause.current_points = { [sequelize.Op.lt]: 0 };
      }
    }
    
    const result = await Customer.findAndCountAll({
      where: whereClause,
      attributes: ['id', 'name', 'phone', 'current_points', 'total_earned_points', 'total_spent_points', 'updated_at'],
      order: [['current_points', 'DESC']],
      offset: (page - 1) * pageSize,
      limit: parseInt(pageSize)
    });
    
    res.json({
      success: true,
      data: {
        list: result.rows,
        total: result.count,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取积分列表失败', error: error.message });
  }
});

router.get('/:customerId/records', async (req, res) => {
  try {
    const { customerId } = req.params;
    
    const records = await PointRecord.findAll({
      where: { customer_id: customerId },
      order: [['created_at', 'DESC']],
      limit: 50
    });
    
    const customer = await Customer.findByPk(customerId, {
      attributes: ['name', 'current_points']
    });
    
    res.json({
      success: true,
      data: {
        customer: customer,
        records: records
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取积分明细失败', error: error.message });
  }
});

router.post('/:customerId/deduct', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { customerId } = req.params;
    const { points, exchangeItem, reason } = req.body;
    
    if (!points || points <= 0) {
      return res.status(400).json({ success: false, message: '请输入有效的扣减积分数量' });
    }
    
    const customer = await Customer.findByPk(customerId, { transaction });
    if (!customer) {
      return res.status(404).json({ success: false, message: '客户不存在' });
    }
    
    await PointRecord.create({
      customerId: customerId,
      type: 'spend',
      points: -points,
      exchangeItem: exchangeItem,
      reason: reason || '手动扣减'
    }, { transaction });
    
    await Customer.update({
      current_points: sequelize.literal(`current_points - ${points}`),
      total_spent_points: sequelize.literal(`total_spent_points + ${points}`)
    }, {
      where: { id: customerId },
      transaction
    });
    
    await transaction.commit();
    
    res.json({ success: true, message: '积分扣减成功' });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ success: false, message: '积分扣减失败', error: error.message });
  }
});

router.get('/eco/config', async (req, res) => {
  try {
    const settings = await Settings.findOne({
      where: { category: 'eco_dashboard' }
    });
    
    let config = {
      totalPoints: 0,
      savedPower: 0,
      servedFamilies: 0,
      reducedCarbon: 0
    };
    
    if (settings && settings.values) {
      config = settings.values;
    }
    
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取环保配置失败', error: error.message });
  }
});

router.post('/eco/config', async (req, res) => {
  try {
    const { totalPoints, savedPower, servedFamilies, reducedCarbon } = req.body;
    
    const config = {
      totalPoints: parseInt(totalPoints) || 0,
      savedPower: parseInt(savedPower) || 0,
      servedFamilies: parseInt(servedFamilies) || 0,
      reducedCarbon: parseInt(reducedCarbon) || 0
    };
    
    const existing = await Settings.findOne({
      where: { category: 'eco_dashboard' }
    });
    
    if (existing) {
      existing.values = config;
      await existing.save();
    } else {
      await Settings.create({
        category: 'eco_dashboard',
        values: config
      });
    }
    
    res.json({ success: true, message: '环保配置更新成功', data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新环保配置失败', error: error.message });
  }
});

module.exports = router;