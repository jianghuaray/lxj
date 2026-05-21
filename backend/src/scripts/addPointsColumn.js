const { sequelize } = require('./models');

async function addPointsColumns() {
  try {
    console.log('正在连接数据库...');
    await sequelize.authenticate();
    console.log('数据库连接成功');

    const [results] = await sequelize.query("PRAGMA table_info(customers)");
    const columnNames = results.map(col => col.name);

    console.log('当前 customers 表的列:', columnNames);

    const pointsColumns = [
      { name: 'current_points', sql: 'INTEGER DEFAULT 0 NOT NULL' },
      { name: 'total_earned_points', sql: 'INTEGER DEFAULT 0 NOT NULL' },
      { name: 'total_spent_points', sql: 'INTEGER DEFAULT 0 NOT NULL' }
    ];

    for (const col of pointsColumns) {
      if (!columnNames.includes(col.name)) {
        console.log(`添加列: ${col.name}`);
        await sequelize.query(`ALTER TABLE customers ADD COLUMN ${col.name} ${col.sql}`);
        console.log(`✅ ${col.name} 添加成功`);
      } else {
        console.log(`⏭️ ${col.name} 已存在，跳过`);
      }
    }

    console.log('\n🎉 所有积分列添加完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 发生错误:', error);
    process.exit(1);
  }
}

addPointsColumns();
