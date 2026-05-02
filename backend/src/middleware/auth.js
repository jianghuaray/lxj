const jwt = require('jsonwebtoken');
const { User } = require('../models');

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: '未提供认证令牌' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId);

    if (!user || user.status !== 1) {
      return res.status(401).json({ error: '用户不存在或已被禁用' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: '无效的认证令牌' });
  }
};

const authAdmin = async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
};

module.exports = { auth, authAdmin };
