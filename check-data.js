
require('dotenv').config();
const { sequelize, WorkOrder, Customer, Technician } = require('./backend/src/models');

async function check() {
  await sequelize.authenticate();
  console.log('✅ 数据安全检查：');
  console.log('   工单数量：', await WorkOrder.count());
  console.log('   客户数量：', await Customer.count());
  console.log('   师傅数量：', await Technician.count());
  await sequelize.close();
}

check().catch(console.error);
