const express = require('express');
const { Op, fn, col } = require('sequelize');
const { Volunteer, VolunteerService } = require('../models');
const { auth } = require('../middleware/auth');

const router = express.Router();

// 获取志愿者统计数据
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalCount, monthNewCount, partyCount, communityResult] = await Promise.all([
      Volunteer.count(),
      Volunteer.count({ where: { created_at: { [Op.gte]: monthStart } } }),
      Volunteer.count({ where: { political_status: 'party' } }),
      Volunteer.findAll({
        attributes: [[fn('DISTINCT', col('community')), 'community']],
        raw: true
      })
    ]);

    const partyRatio = totalCount > 0 ? Math.round(partyCount / totalCount * 100) : 0;
    const communityCount = communityResult.length;

    res.json({
      totalVolunteers: totalCount,
      monthNew: monthNewCount,
      partyRatio,
      communityCount
    });
  } catch (error) {
    console.error('获取志愿者统计失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取志愿者列表
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword, community, politicalStatus, gender } = req.query;

    const where = {};
    if (keyword) {
      where[Op.or] = [
        { name: { [Op.like]: `%${keyword}%` } },
        { phone: { [Op.like]: `%${keyword}%` } }
      ];
    }
    if (community) {
      where.community = community;
    }
    if (politicalStatus) {
      where.politicalStatus = politicalStatus;
    }
    if (gender) {
      where.gender = gender;
    }

    const offset = (page - 1) * pageSize;

    const { count, rows } = await Volunteer.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(pageSize),
      offset
    });

    // 为每个志愿者添加服务次数和时长统计
    const volunteerIds = rows.map(v => v.id);
    const serviceStats = await VolunteerService.findAll({
      attributes: [
        'volunteerId',
        [VolunteerService.sequelize.fn('COUNT', VolunteerService.sequelize.col('id')), 'serviceCount']
      ],
      where: { volunteerId: { [Op.in]: volunteerIds } },
      group: ['volunteerId']
    });

    const statsMap = {};
    serviceStats.forEach(s => {
      statsMap[s.dataValues.volunteerId] = parseInt(s.dataValues.serviceCount);
    });

    const items = rows.map(v => {
      const data = v.toJSON();
      return {
        ...data,
        serviceCount: statsMap[data.id] || 0
      };
    });

    res.json({
      items,
      total: count,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (error) {
    console.error('获取志愿者列表失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取志愿者详情
router.get('/:id', auth, async (req, res) => {
  try {
    const volunteer = await Volunteer.findByPk(req.params.id, {
      include: [
        {
          model: VolunteerService,
          as: 'services',
          order: [['service_date', 'DESC']]
        }
      ]
    });

    if (!volunteer) {
      return res.status(404).json({ error: '志愿者不存在' });
    }

    res.json(volunteer);
  } catch (error) {
    console.error('获取志愿者详情失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 创建志愿者
router.post('/', auth, async (req, res) => {
  try {
    const { name, phone, age, gender, politicalStatus, community, address, specialty, serviceIntention } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ error: '姓名不能为空' });
    if (!phone) return res.status(400).json({ error: '电话不能为空' });
    if (!age) return res.status(400).json({ error: '年龄不能为空' });
    if (!gender) return res.status(400).json({ error: '性别不能为空' });
    if (!politicalStatus) return res.status(400).json({ error: '政治面貌不能为空' });
    if (!community) return res.status(400).json({ error: '所属社区不能为空' });
    // address 选填，不校验
    // phone 格式验证已移除，仅保证必填

    const existing = await Volunteer.findOne({ where: { phone } });
    if (existing) {
      return res.status(400).json({ error: '该手机号已存在' });
    }

    const volunteer = await Volunteer.create({
      name, phone, age, gender, politicalStatus, community, address, specialty, serviceIntention
    });

    res.status(201).json(volunteer);
  } catch (error) {
    console.error('创建志愿者失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新志愿者
router.put('/:id', auth, async (req, res) => {
  try {
    const volunteer = await Volunteer.findByPk(req.params.id);
    if (!volunteer) {
      return res.status(404).json({ error: '志愿者不存在' });
    }

    const { name, phone, age, gender, politicalStatus, community, address, specialty, serviceIntention } = req.body;

    if (phone && phone !== volunteer.phone) {
      const existing = await Volunteer.findOne({ where: { phone } });
      if (existing) {
        return res.status(400).json({ error: '该手机号已存在' });
      }
    }

    await volunteer.update({
      name, phone, age, gender, politicalStatus, community, address, specialty, serviceIntention
    });

    res.json({ message: '更新成功' });
  } catch (error) {
    console.error('更新志愿者失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 删除志愿者
router.delete('/:id', auth, async (req, res) => {
  try {
    const volunteer = await Volunteer.findByPk(req.params.id);
    if (!volunteer) {
      return res.status(404).json({ error: '志愿者不存在' });
    }

    await volunteer.destroy();
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除志愿者失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 添加服务记录
router.post('/:id/services', auth, async (req, res) => {
  try {
    const volunteer = await Volunteer.findByPk(req.params.id);
    if (!volunteer) {
      return res.status(404).json({ error: '志愿者不存在' });
    }

    const { serviceDate, serviceContent, serviceDuration, serviceCommunity } = req.body;

    if (!serviceDate) return res.status(400).json({ error: '服务日期不能为空' });
    if (!serviceContent) return res.status(400).json({ error: '服务内容不能为空' });
    if (!serviceDuration) return res.status(400).json({ error: '服务时长不能为空' });
    if (!serviceCommunity) return res.status(400).json({ error: '服务社区不能为空' });

    const service = await VolunteerService.create({
      volunteerId: req.params.id,
      serviceDate,
      serviceContent,
      serviceDuration,
      serviceCommunity
    });

    res.status(201).json(service);
  } catch (error) {
    console.error('添加服务记录失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新服务记录
router.put('/:id/services/:serviceId', auth, async (req, res) => {
  try {
    const service = await VolunteerService.findByPk(req.params.serviceId);
    if (!service) {
      return res.status(404).json({ error: '服务记录不存在' });
    }

    const { serviceDate, serviceContent, serviceDuration, serviceCommunity } = req.body;

    await service.update({
      serviceDate,
      serviceContent,
      serviceDuration,
      serviceCommunity
    });

    res.json({ message: '更新成功' });
  } catch (error) {
    console.error('更新服务记录失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 删除服务记录
router.delete('/:id/services/:serviceId', auth, async (req, res) => {
  try {
    const service = await VolunteerService.findByPk(req.params.serviceId);
    if (!service) {
      return res.status(404).json({ error: '服务记录不存在' });
    }

    await service.destroy();
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除服务记录失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
