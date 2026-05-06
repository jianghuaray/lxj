require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

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
const volunteerRoutes = require('./routes/volunteers');
const pointsRoutes = require('./routes/points');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// 启用 trust proxy 以支持 Nginx 转发
app.set('trust proxy', 1);

// 安全头
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));

// CORS — 生产环境从环境变量读取前端域名
app.use(cors({
  origin: process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173'),
  credentials: true
}));

// 全局 API 频率限制：每个 IP 每分钟最多 120 次请求
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '请求过于频繁，请稍后再试' },
  validate: { trustProxy: false }
});
app.use('/api', apiLimiter);

// 限制请求体大小
app.use(express.json({ limit: '1mb' }));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', workOrderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/technicians', technicianRoutes);
app.use('/api/callbacks', callbackRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/construction', constructionRoutes);
app.use('/api/volunteers', volunteerRoutes);
app.use('/api/points', pointsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 生产环境：服务前端静态文件
if (isProduction) {
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));
  // SPA fallback：非 API 请求返回 index.html
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendDist, 'index.html'));
    }
  });
}

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

// 进程级异常保护，防止服务静默崩溃
process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
  // 给日志一点时间写入，然后退出让 PM2 重启
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection]', reason);
});

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');

    // SQLite 不支持 ALTER COLUMN，手动迁移 work_orders 表以允许 customer_id 为 NULL
    try {
      const [cols] = await sequelize.query("PRAGMA table_info(work_orders)");
      const customerIdCol = cols.find(c => c.name === 'customer_id');
      if (customerIdCol && customerIdCol.notnull === 1) {
        console.log('Migrating work_orders: allowing customer_id to be NULL...');
        await sequelize.query('DROP TABLE IF EXISTS work_orders_new');
        await sequelize.query('PRAGMA foreign_keys = OFF');
        await sequelize.query(`
          CREATE TABLE work_orders_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_no TEXT UNIQUE NOT NULL,
            customer_id INTEGER,
            customer_name TEXT NOT NULL,
            customer_phone TEXT NOT NULL,
            area TEXT,
            address TEXT,
            source_channel TEXT,
            problem_category TEXT,
            problem_description TEXT,
            receiver_id INTEGER,
            received_at TEXT,
            completed_at TEXT,
            receiver_remark TEXT,
            cancel_reason TEXT,
            status TEXT,
            created_at TEXT,
            updated_at TEXT
          )
        `);
        await sequelize.query('INSERT INTO work_orders_new SELECT * FROM work_orders');
        await sequelize.query('DROP TABLE work_orders');
        await sequelize.query('ALTER TABLE work_orders_new RENAME TO work_orders');
        await sequelize.query('PRAGMA foreign_keys = ON');
        console.log('work_orders migration complete');
      }
    } catch (e) {
      console.log('work_orders migration skipped:', e.message);
    }

    // 同步数据库：创建缺失的表
    await sequelize.sync();
    console.log('数据库同步完成');

    app.listen(PORT, () => {
      console.log(`服务器运行在 http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
};

startServer();
