const express = require('express');
const { Op } = require('sequelize');
const { auth, authAdmin } = require('../middleware/auth');
const { Settings, OperationLog } = require('../models');

const router = express.Router();

// Default values - used to seed the database on first run
const DEFAULTS = {
  serviceTypes: ['水电维修', '下水疏通', '家具门窗', '家电维修', '家电清洗', '测漏防水', '开锁换锁', '局部翻新'],
  serviceAreas: ['新城区', '未央区', '高新区', '灞桥区', '雁塔区', '碑林区', '莲湖区'],
  sourceChannels: ['电话', '微信', '楼管推荐', '老客介绍', '线上平台', '其他'],
  cancelReasons: ['客户取消', '信息错误', '重复下单', '超出服务范围', '无法联系客户', '其他']
};

// Map frontend category names to DB category keys
const CATEGORY_MAP = {
  'service-types': 'serviceTypes',
  'areas': 'serviceAreas',
  'channels': 'sourceChannels',
  'cancel-reasons': 'cancelReasons'
};

// Ensure a settings category exists in DB, seed with defaults if not
async function ensureCategory(category) {
  let setting = await Settings.findOne({ where: { category } });
  if (!setting) {
    setting = await Settings.create({
      category,
      values: DEFAULTS[category] || []
    });
  }
  return setting;
}

// Log operation to database
async function logOperation(action, detail, operatorId, operatorName) {
  await OperationLog.create({
    action,
    detail,
    operator_id: operatorId || null,
    operator_name: operatorName || 'system'
  });
}

// ---- Service Types ----
router.get('/service-types', auth, async (req, res) => {
  try {
    const setting = await ensureCategory('serviceTypes');
    res.json({ items: setting.values });
  } catch (error) {
    console.error('获取服务类型失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/service-types', auth, authAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: '请提供类型名称' });

    const setting = await ensureCategory('serviceTypes');
    const values = setting.values || [];
    if (values.includes(name)) return res.status(400).json({ error: '类型已存在' });

    values.push(name);
    await setting.update({ values });
    await logOperation('添加服务类型', `添加: ${name}`, req.user?.id, req.user?.real_name);
    res.status(201).json({ items: values });
  } catch (error) {
    console.error('添加服务类型失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.delete('/service-types/:name', auth, authAdmin, async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const setting = await ensureCategory('serviceTypes');
    const values = (setting.values || []).filter(t => t !== name);
    await setting.update({ values });
    await logOperation('删除服务类型', `删除: ${name}`, req.user?.id, req.user?.real_name);
    res.json({ items: values });
  } catch (error) {
    console.error('删除服务类型失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ---- Service Areas ----
router.get('/areas', auth, async (req, res) => {
  try {
    const setting = await ensureCategory('serviceAreas');
    res.json({ items: setting.values });
  } catch (error) {
    console.error('获取服务区域失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/areas', auth, authAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: '请提供区域名称' });

    const setting = await ensureCategory('serviceAreas');
    const values = setting.values || [];
    if (values.includes(name)) return res.status(400).json({ error: '区域已存在' });

    values.push(name);
    await setting.update({ values });
    await logOperation('添加服务区域', `添加: ${name}`, req.user?.id, req.user?.real_name);
    res.status(201).json({ items: values });
  } catch (error) {
    console.error('添加服务区域失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.delete('/areas/:name', auth, authAdmin, async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const setting = await ensureCategory('serviceAreas');
    const values = (setting.values || []).filter(a => a !== name);
    await setting.update({ values });
    await logOperation('删除服务区域', `删除: ${name}`, req.user?.id, req.user?.real_name);
    res.json({ items: values });
  } catch (error) {
    console.error('删除服务区域失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ---- Source Channels ----
router.get('/channels', auth, async (req, res) => {
  try {
    const setting = await ensureCategory('sourceChannels');
    res.json({ items: setting.values });
  } catch (error) {
    console.error('获取来源渠道失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/channels', auth, authAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: '请提供渠道名称' });

    const setting = await ensureCategory('sourceChannels');
    const values = setting.values || [];
    if (values.includes(name)) return res.status(400).json({ error: '渠道已存在' });

    values.push(name);
    await setting.update({ values });
    await logOperation('添加来源渠道', `添加: ${name}`, req.user?.id, req.user?.real_name);
    res.status(201).json({ items: values });
  } catch (error) {
    console.error('添加来源渠道失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.delete('/channels/:name', auth, authAdmin, async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const setting = await ensureCategory('sourceChannels');
    const values = (setting.values || []).filter(c => c !== name);
    await setting.update({ values });
    await logOperation('删除来源渠道', `删除: ${name}`, req.user?.id, req.user?.real_name);
    res.json({ items: values });
  } catch (error) {
    console.error('删除来源渠道失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ---- Cancel Reasons ----
router.get('/cancel-reasons', auth, async (req, res) => {
  try {
    const setting = await ensureCategory('cancelReasons');
    res.json({ items: setting.values });
  } catch (error) {
    console.error('获取取消原因失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/cancel-reasons', auth, authAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: '请提供原因名称' });

    const setting = await ensureCategory('cancelReasons');
    const values = setting.values || [];
    if (values.includes(name)) return res.status(400).json({ error: '原因已存在' });

    values.push(name);
    await setting.update({ values });
    await logOperation('添加取消原因', `添加: ${name}`, req.user?.id, req.user?.real_name);
    res.status(201).json({ items: values });
  } catch (error) {
    console.error('添加取消原因失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.delete('/cancel-reasons/:name', auth, authAdmin, async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const setting = await ensureCategory('cancelReasons');
    const values = (setting.values || []).filter(r => r !== name);
    await setting.update({ values });
    await logOperation('删除取消原因', `删除: ${name}`, req.user?.id, req.user?.real_name);
    res.json({ items: values });
  } catch (error) {
    console.error('删除取消原因失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ---- Operation Logs ----
router.get('/logs', auth, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, action, keyword, startDate, endDate } = req.query;

    const where = {};
    if (action) where.action = { [Op.like]: `%${action}%` };
    if (keyword) {
      where[Op.or] = [
        { detail: { [Op.like]: `%${keyword}%` } },
        { action: { [Op.like]: `%${keyword}%` } }
      ];
    }
    if (startDate && endDate) {
      where.created_at = { [Op.between]: [new Date(startDate), new Date(endDate)] };
    } else if (startDate) {
      where.created_at = { [Op.gte]: new Date(startDate) };
    } else if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      where.created_at = { [Op.lt]: end };
    }

    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const { count, rows } = await OperationLog.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(pageSize),
      offset
    });

    res.json({
      items: rows,
      total: count,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (error) {
    console.error('获取操作日志失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
