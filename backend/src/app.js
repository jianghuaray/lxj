require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// 启动时校验必要环境变量
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set. Please set it in your .env file.');
  process.exit(1);
}

const { sequelize } = require('./models');
const authRoutes = require('./routes/auth');
const workOrderRoutes = require('./routes/workOrders');
const customerRoutes = require('./routes/customers');
const technicianRoutes = require('./routes/technicians');
const callbackRoutes = require('./routes/callbacks');
const dashboardRoutes = require('./routes/dashboard');
const userRoutes = require('./routes/users');
const settingsRoutes = require('./routes/settings');
const constructionRoutes = require('./routes/constructions');

const app = express();
const PORT = process.env.PORT || 3000;

// 限制 CORS 为前端域名，避免任意跨域访问
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// 限制请求体大小，防止超大请求耗尽内存
app.use(express.json({ limit: '1mb' }));

// API routes - aligned with frontend api.js baseURL: '/api'
app.use('/api/auth', authRoutes);
app.use('/api/orders', workOrderRoutes);       // Frontend uses /api/orders
app.use('/api/customers', customerRoutes);
app.use('/api/technicians', technicianRoutes);
app.use('/api/callbacks', callbackRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);             // User management
app.use('/api/settings', settingsRoutes);       // System settings & logs
app.use('/api/construction', constructionRoutes); // Construction fees

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');

    // Don't auto-sync in production - use init:db script instead
    // await sequelize.sync({ alter: true });
    
    app.listen(PORT, () => {
      console.log(`服务器运行在 http://localhost:${PORT}`);
      console.log('使用 npm run init:db 初始化数据库');
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
};

startServer();
