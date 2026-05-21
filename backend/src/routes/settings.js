const express = require('express');
const { Op } = require('sequelize');
const { auth, authAdmin } = require('../middleware/auth');
const { Settings, OperationLog, Property, BuildingManager } = require('../models');
const { escapeLike } = require('../utils/sanitize');

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
      const originalValues = setting.values || [];
      if (originalValues.includes(name.trim())) return res.status(400).json({ error: `${label}已存在` });

      // Must create a NEW array — mutating the same ref causes Sequelize to skip UPDATE
      const values = [...originalValues, name.trim()];
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

// ---- Batch GET: return all base data in one request ----
router.get('/all', auth, async (req, res) => {
  try {
    const [serviceTypes, serviceAreas, sourceChannels, cancelReasons, properties, buildingManagers] = await Promise.all([
      ensureCategory('serviceTypes'),
      ensureCategory('serviceAreas'),
      ensureCategory('sourceChannels'),
      ensureCategory('cancelReasons'),
      Property.findAll({ order: [['status', 'DESC'], ['name', 'ASC']] }),
      BuildingManager.findAll({ order: [['status', 'DESC'], ['name', 'ASC']] }),
    ]);
    res.json({
      serviceTypes: serviceTypes.values || [],
      areas: serviceAreas.values || [],
      channels: sourceChannels.values || [],
      cancelReasons: cancelReasons.values || [],
      properties: properties.map(item => ({
        id: item.id,
        name: item.name,
        defaultRate: Number(item.default_rate) || 0,
        defaultCollectionParty: item.default_collection_party || 'technician',
        settlementCycle: item.settlement_cycle || 'monthly',
        status: item.status,
        remark: item.remark || ''
      })),
      buildingManagers: buildingManagers.map(item => ({
        id: item.id,
        name: item.name,
        defaultRate: Number(item.default_rate) || 0,
        status: item.status,
        remark: item.remark || ''
      })),
    });
  } catch (error) {
    console.error('获取基础数据失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// Register CRUD for all four categories
registerCRUD(router, 'service-types', 'serviceTypes');
registerCRUD(router, 'areas', 'serviceAreas');
registerCRUD(router, 'channels', 'sourceChannels');
registerCRUD(router, 'cancel-reasons', 'cancelReasons');

function formatProperty(item) {
  return {
    id: item.id,
    name: item.name,
    defaultRate: Number(item.default_rate) || 0,
    defaultCollectionParty: item.default_collection_party || 'technician',
    settlementCycle: item.settlement_cycle || 'monthly',
    status: item.status,
    remark: item.remark || ''
  };
}

function formatBuildingManager(item) {
  return {
    id: item.id,
    name: item.name,
    defaultRate: Number(item.default_rate) || 0,
    status: item.status,
    remark: item.remark || ''
  };
}

router.get('/properties', auth, async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status === 'active') where.status = 1;
    const items = await Property.findAll({ where, order: [['status', 'DESC'], ['name', 'ASC']] });
    res.json({ items: items.map(formatProperty) });
  } catch (error) {
    console.error('获取物业列表失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/properties', auth, authAdmin, async (req, res) => {
  try {
    const { name, defaultRate, defaultCollectionParty = 'technician', settlementCycle = 'monthly', status = 1, remark } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: '请提供物业名称' });
    const item = await Property.create({
      name: name.trim(),
      default_rate: defaultRate || 0,
      default_collection_party: defaultCollectionParty,
      settlement_cycle: settlementCycle,
      status,
      remark
    });
    await logOperation('添加物业', `添加: ${item.name}`, req.user?.id, req.user?.real_name);
    res.status(201).json(formatProperty(item));
  } catch (error) {
    console.error('添加物业失败:', error);
    res.status(500).json({ error: error.name === 'SequelizeUniqueConstraintError' ? '物业名称已存在' : '服务器错误' });
  }
});

router.put('/properties/:id', auth, authAdmin, async (req, res) => {
  try {
    const item = await Property.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: '物业不存在' });
    const { name, defaultRate, defaultCollectionParty, settlementCycle, status, remark } = req.body;
    await item.update({
      ...(name !== undefined && { name: name.trim() }),
      ...(defaultRate !== undefined && { default_rate: defaultRate }),
      ...(defaultCollectionParty !== undefined && { default_collection_party: defaultCollectionParty }),
      ...(settlementCycle !== undefined && { settlement_cycle: settlementCycle }),
      ...(status !== undefined && { status }),
      ...(remark !== undefined && { remark })
    });
    await logOperation('修改物业', `修改: ${item.name}`, req.user?.id, req.user?.real_name);
    res.json(formatProperty(item));
  } catch (error) {
    console.error('修改物业失败:', error);
    res.status(500).json({ error: error.name === 'SequelizeUniqueConstraintError' ? '物业名称已存在' : '服务器错误' });
  }
});

router.delete('/properties/:id', auth, authAdmin, async (req, res) => {
  try {
    const item = await Property.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: '物业不存在' });
    await item.destroy();
    await logOperation('删除物业', `删除: ${item.name}`, req.user?.id, req.user?.real_name);
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除物业失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/building-managers', auth, async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status === 'active') where.status = 1;
    const items = await BuildingManager.findAll({ where, order: [['status', 'DESC'], ['name', 'ASC']] });
    res.json({ items: items.map(formatBuildingManager) });
  } catch (error) {
    console.error('获取楼管列表失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/building-managers', auth, authAdmin, async (req, res) => {
  try {
    const { name, defaultRate, status = 1, remark } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: '请提供楼管名称' });
    const item = await BuildingManager.create({
      name: name.trim(),
      default_rate: defaultRate || 0,
      status,
      remark
    });
    await logOperation('添加楼管', `添加: ${item.name}`, req.user?.id, req.user?.real_name);
    res.status(201).json(formatBuildingManager(item));
  } catch (error) {
    console.error('添加楼管失败:', error);
    res.status(500).json({ error: error.name === 'SequelizeUniqueConstraintError' ? '楼管名称已存在' : '服务器错误' });
  }
});

router.put('/building-managers/:id', auth, authAdmin, async (req, res) => {
  try {
    const item = await BuildingManager.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: '楼管不存在' });
    const { name, defaultRate, status, remark } = req.body;
    await item.update({
      ...(name !== undefined && { name: name.trim() }),
      ...(defaultRate !== undefined && { default_rate: defaultRate }),
      ...(status !== undefined && { status }),
      ...(remark !== undefined && { remark })
    });
    await logOperation('修改楼管', `修改: ${item.name}`, req.user?.id, req.user?.real_name);
    res.json(formatBuildingManager(item));
  } catch (error) {
    console.error('修改楼管失败:', error);
    res.status(500).json({ error: error.name === 'SequelizeUniqueConstraintError' ? '楼管名称已存在' : '服务器错误' });
  }
});

router.delete('/building-managers/:id', auth, authAdmin, async (req, res) => {
  try {
    const item = await BuildingManager.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: '楼管不存在' });
    await item.destroy();
    await logOperation('删除楼管', `删除: ${item.name}`, req.user?.id, req.user?.real_name);
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除楼管失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ---- Operation Logs ----
router.get('/logs', auth, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, action, keyword, startDate, endDate } = req.query;

    const where = {};
    if (action) where.action = { [Op.like]: `%${escapeLike(action)}%` };
    if (keyword) {
      const safeKeyword = escapeLike(keyword);
      where[Op.or] = [
        { detail: { [Op.like]: `%${safeKeyword}%` } },
        { action: { [Op.like]: `%${safeKeyword}%` } }
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
