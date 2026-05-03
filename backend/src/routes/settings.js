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

// Map URL slug → DB category key (camelCase)
const URL_TO_DB = {
  'service-types': 'serviceTypes',
  'areas': 'serviceAreas',
  'channels': 'sourceChannels',
  'cancel-reasons': 'cancelReasons'
};

// Map DB category key → Chinese label
const DB_TO_LABEL = {
  'serviceTypes': '服务类型',
  'serviceAreas': '服务区域',
  'sourceChannels': '来源渠道',
  'cancelReasons': '取消原因'
};

// Ensure a settings row exists; seed with defaults if empty or missing
async function ensureCategory(dbKey) {
  // Look up by DB key first
  let setting = await Settings.findOne({ where: { category: dbKey } });

  // Migration: if not found, check if old data was stored under Chinese name
  if (!setting) {
    const oldLabel = DB_TO_LABEL[dbKey];
    if (oldLabel) {
      setting = await Settings.findOne({ where: { category: oldLabel } });
      if (setting) {
        // Migrate: fix category field to camelCase key
        await setting.update({ category: dbKey, values: setting.values || DEFAULTS[dbKey] || [] });
        return setting;
      }
    }
    // Not found at all → create with defaults
    setting = await Settings.create({ category: dbKey, values: DEFAULTS[dbKey] || [] });
    return setting;
  }

  // Exists but values is empty → seed defaults
  if (!setting.values || setting.values.length === 0) {
    await setting.update({ values: DEFAULTS[dbKey] || [] });
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

// ---- Generic CRUD handlers per category ----
// urlSlug: URL path segment (e.g. 'service-types')
// dbKey:   camelCase key in DB + DEFAULTS (e.g. 'serviceTypes')
function registerCRUD(router, urlSlug, dbKey) {
  const label = DB_TO_LABEL[dbKey] || dbKey;

  // GET
  router.get(`/${urlSlug}`, auth, async (req, res) => {
    try {
      const setting = await ensureCategory(dbKey);
      res.json({ items: setting.values });
    } catch (error) {
      console.error(`获取${label}失败:`, error);
      res.status(500).json({ error: '服务器错误' });
    }
  });

  // POST (add)
  router.post(`/${urlSlug}`, auth, authAdmin, async (req, res) => {
    try {
      const { name } = req.body;
      if (!name || !name.trim()) return res.status(400).json({ error: `请提供${label}名称` });

      const setting = await ensureCategory(dbKey);
      const values = setting.values || [];
      if (values.includes(name.trim())) return res.status(400).json({ error: `${label}已存在` });

      values.push(name.trim());
      await setting.update({ values });
      await logOperation(`添加${label}`, `添加: ${name.trim()}`, req.user?.id, req.user?.real_name);
      res.status(201).json({ items: values });
    } catch (error) {
      console.error(`添加${label}失败:`, error);
      res.status(500).json({ error: '服务器错误' });
    }
  });

  // PUT (edit / rename)
  router.put(`/${urlSlug}/:name`, auth, authAdmin, async (req, res) => {
    try {
      const oldName = decodeURIComponent(req.params.name);
      const { name } = req.body;
      if (!name || !name.trim()) return res.status(400).json({ error: `请提供新的${label}名称` });

      const newName = name.trim();
      const setting = await ensureCategory(dbKey);
      const values = setting.values || [];

      if (!values.includes(oldName)) return res.status(404).json({ error: '项目不存在' });
      if (oldName !== newName && values.includes(newName)) return res.status(400).json({ error: `新${label}名称已存在` });

      const newValues = values.map(v => v === oldName ? newName : v);
      await setting.update({ values: newValues });
      await logOperation(`修改${label}`, `${oldName} → ${newName}`, req.user?.id, req.user?.real_name);
      res.json({ items: newValues });
    } catch (error) {
      console.error(`修改${label}失败:`, error);
      res.status(500).json({ error: '服务器错误' });
    }
  });

  // DELETE
  router.delete(`/${urlSlug}/:name`, auth, authAdmin, async (req, res) => {
    try {
      const name = decodeURIComponent(req.params.name);
      const setting = await ensureCategory(dbKey);
      const values = (setting.values || []).filter(t => t !== name);
      await setting.update({ values });
      await logOperation(`删除${label}`, `删除: ${name}`, req.user?.id, req.user?.real_name);
      res.json({ items: values });
    } catch (error) {
      console.error(`删除${label}失败:`, error);
      res.status(500).json({ error: '服务器错误' });
    }
  });
}

// Register CRUD for all four categories
registerCRUD(router, 'service-types', 'serviceTypes');
registerCRUD(router, 'areas', 'serviceAreas');
registerCRUD(router, 'channels', 'sourceChannels');
registerCRUD(router, 'cancel-reasons', 'cancelReasons');

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
