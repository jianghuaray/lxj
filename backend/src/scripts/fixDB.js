require('dotenv').config();
const { sequelize, Volunteer, VolunteerService } = require('../models');

async function fixDB() {
  console.log('正在连接数据库...');
  await sequelize.authenticate();
  console.log('✅ 数据库连接成功');

  console.log('正在同步表结构...');
  await sequelize.sync();
  console.log('✅ 数据库表同步完成！');

  await sequelize.close();
  process.exit(0);
}

fixDB().catch(err => {
  console.error('❌ 修复失败:', err);
  process.exit(1);
});
