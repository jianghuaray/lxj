const express = require('express');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User } = require('../models');
const { auth, authAdmin } = require('../middleware/auth');
const { validatePassword, validateLength, escapeLike } = require('../utils/sanitize');

const router = express.Router();

// 获取用户列表
router.get('/', auth, authAdmin, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword, role } = req.query;

    const where = {};
    if (role) where.role = role;
    if (keyword) {
      const safeKeyword = escapeLike(keyword);
      where[Op.or] = [
        { username: { [Op.like]: `%${safeKeyword}%` } },
        { real_name: { [Op.like]: `%${safeKeyword}%` } }
      ];
    }

    const offset = (page - 1) * pageSize;

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']],
      limit: parseInt(pageSize),
      offset
    });

    const items = rows.map(u => {
      const user = u.toJSON();
      return {
        id: user.id,
        username: user.username,
        realName: user.real_name,
        role: user.role,
        status: user.status,
        lastLoginAt: user.last_login_at,
        createdAt: user.created_at
      };
    });

    res.json({
      items,
      total: count,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 创建用户
router.post('/', auth, authAdmin, async (req, res) => {
  try {
    const { username, password, realName, role } = req.body;

    if (!username || !password || !realName) {
      return res.status(400).json({ error: '用户名、密码和姓名为必填项' });
    }

    // Password strength validation (consistent with change-password and reset-password)
    const pwdCheck = validatePassword(password);
    if (!pwdCheck.valid) {
      return res.status(400).json({ error: `密码不符合要求：${pwdCheck.error}` });
    }

    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      password: hashedPassword,
      real_name: realName,
      role: role || 'operator',
      status: 1
    });

    res.status(201).json({
      id: user.id,
      username: user.username,
      realName: user.real_name,
      role: user.role,
      status: user.status
    });
  } catch (error) {
    console.error('创建用户失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新用户
router.patch('/:id', auth, authAdmin, async (req, res) => {
  try {
    const { realName, role, status } = req.body;

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    await user.update({
      ...(realName !== undefined && { real_name: realName }),
      ...(role !== undefined && { role }),
      ...(status !== undefined && { status })
    });

    res.json({
      id: user.id,
      username: user.username,
      realName: user.real_name,
      role: user.role,
      status: user.status
    });
  } catch (error) {
    console.error('更新用户失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 重置密码
router.patch('/:id/reset-password', auth, authAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return res.status(400).json({ error: '新密码不符合要求：至少 8 位，包含字母和数字' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: '密码重置成功' });
  } catch (error) {
    console.error('重置密码失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 删除用户
router.delete('/:id', auth, authAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // Can't delete yourself
    if (user.id === req.user.id) {
      return res.status(400).json({ error: '不能删除自己' });
    }

    // Soft delete by disabling
    user.status = 0;
    await user.save();

    res.json({ message: '用户已禁用' });
  } catch (error) {
    console.error('删除用户失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
