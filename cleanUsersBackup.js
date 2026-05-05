
require('dotenv').config();
const { sequelize } = require('./src/models');

async function clean() {
  try {
    await sequelize.authenticate();
    console.log('连接数据库成功');
    await sequelize.query('DROP TABLE IF EXISTS users_backup');
    console.log('✅ 已删除 users_backup 表');
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

clean().catch(err => {
  console.error('❌ 错误：', err);
  process.exit(1);
});
