
require('dotenv').config();
const { sequelize, Volunteer, VolunteerService } = require('./backend/src/models');

async function test() {
  try {
    console.log('正在连接数据库...');
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');

    console.log('正在同步表结构...');
    await sequelize.sync({ alter: true });
    console.log('✅ 数据库表同步成功！');

    const count = await Volunteer.count();
    console.log('✅ 志愿者数量:', count);
  } catch (e) {
    console.error('❌ 错误:', e.message);
    console.error(e.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('\n✅ 测试完成！');
  }
}

test();
