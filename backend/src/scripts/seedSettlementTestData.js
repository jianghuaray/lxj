require('dotenv').config();

const {
  sequelize,
  User,
  Customer,
  Technician,
  WorkOrder,
  Construction,
  CallbackRecord,
  Property,
  BuildingManager
} = require('../models');
const { calculateShareSnapshot } = require('../utils/shareCalculator');

const TEST_PREFIX = 'TEST-SETTLE-';

function daysAgo(days, hour = 10) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

async function upsertByKey(model, where, values) {
  const existing = await model.findOne({ where });
  if (existing) {
    await existing.update(values);
    return existing;
  }
  return model.create({ ...where, ...values });
}

async function clearPreviousTestData() {
  const orders = await WorkOrder.findAll({
    where: {
      order_no: sequelize.where(
        sequelize.fn('substr', sequelize.col('order_no'), 1, TEST_PREFIX.length),
        TEST_PREFIX
      )
    },
    attributes: ['id']
  });
  const orderIds = orders.map(item => item.id);
  if (orderIds.length === 0) return;

  await CallbackRecord.destroy({ where: { order_id: orderIds } });
  await Construction.destroy({ where: { order_id: orderIds } });
  await WorkOrder.destroy({ where: { id: orderIds } });
}

async function createOrder({
  index,
  customer,
  technician,
  property,
  buildingManager,
  source,
  status = 'completed',
  category,
  description,
  orderAmount,
  materialCost,
  technicianRate,
  propertyRate = 0,
  buildingManagerRate = 0,
  collectionParty = 'technician',
  technicianSettlementStatus = 'unsettled',
  propertySettlementStatus = 'unsettled',
  buildingManagerSettlementStatus = 'unsettled',
  completedDaysAgo,
  receivedOffset = 0,
  receiverId
}) {
  const receivedAt = daysAgo(completedDaysAgo + 1, 9);
  const completedAt = daysAgo(completedDaysAgo, 16);
  const snapshot = calculateShareSnapshot({
    orderAmount,
    technicianRate,
    propertyRate,
    buildingManagerRate,
    materialCost,
    receivedAmount: orderAmount + receivedOffset
  });

  const order = await WorkOrder.create({
    order_no: `${TEST_PREFIX}${String(index).padStart(3, '0')}`,
    status,
    customer_id: customer.id,
    customer_name: customer.name,
    customer_phone: customer.phone,
    area: customer.area,
    address: customer.address,
    source_channel: source.channel,
    source_type: source.type,
    source_property_id: source.type === 'property' ? source.id : null,
    source_property_name: source.type === 'property' ? source.name : null,
    source_building_manager_id: source.type === 'building_manager' ? source.id : null,
    source_building_manager_name: source.type === 'building_manager' ? source.name : null,
    problem_category: category,
    problem_description: description,
    receiver_id: receiverId,
    received_at: receivedAt,
    completed_at: ['completed', 'callback'].includes(status) ? completedAt : null,
    receiver_remark: '测试数据：用于验证分成和对账流程'
  });

  await Construction.create({
    order_id: order.id,
    technician_id: technician.id,
    total_fee: snapshot.orderAmount,
    order_amount: snapshot.orderAmount,
    share_base_amount: snapshot.shareBaseAmount,
    service_fee: snapshot.technicianAmount,
    technician_rate: snapshot.technicianRate,
    technician_amount: snapshot.technicianAmount,
    commission_rate: snapshot.technicianRate,
    property_id: property?.id || null,
    property_name: property?.name || null,
    property_rate: snapshot.propertyRate,
    property_amount: snapshot.propertyAmount,
    building_manager_id: buildingManager?.id || null,
    building_manager_name: buildingManager?.name || null,
    building_manager_rate: snapshot.buildingManagerRate,
    building_manager_amount: snapshot.buildingManagerAmount,
    building_manager_incentive: snapshot.buildingManagerAmount,
    company_amount: snapshot.companyAmount,
    received_fee: snapshot.receivedAmount,
    received_amount: snapshot.receivedAmount,
    material_cost: snapshot.materialCost,
    collection_party: collectionParty,
    technician_settlement_status: technicianSettlementStatus,
    property_settlement_status: property ? propertySettlementStatus : 'settled',
    building_manager_settlement_status: buildingManager ? buildingManagerSettlementStatus : 'settled',
    actual_work: `${category}已完成，测试分成口径：订单总额 ${snapshot.orderAmount}，材料 ${snapshot.materialCost}`,
    dispatch_remark: '测试数据：派单后完成',
    dispatched_at: daysAgo(completedDaysAgo + 1, 11),
    started_at: daysAgo(completedDaysAgo, 14)
  });

  if (status === 'callback') {
    await CallbackRecord.create({
      order_id: order.id,
      is_satisfied: 1,
      satisfaction_score: 5,
      fee_consistent: 1,
      callback_method: 'phone',
      callback_by: receiverId,
      other_feedback: '测试回访：客户满意',
      callback_at: daysAgo(completedDaysAgo - 1, 10)
    });
  }
}

async function seed() {
  await sequelize.authenticate();
  await sequelize.sync();

  await clearPreviousTestData();

  const receiver = await User.findOne({ order: [['id', 'ASC']] });
  const receiverId = receiver?.id || null;

  const [techHan, techLi, techGuo] = await Promise.all([
    upsertByKey(Technician, { phone: '13890010001' }, {
      name: '测试师傅-韩师傅',
      specialties: ['水电维修', '家电维修'],
      commission_rate: 0.30,
      status: 1,
      remark: '测试数据'
    }),
    upsertByKey(Technician, { phone: '13890010002' }, {
      name: '测试师傅-李师傅',
      specialties: ['下水疏通', '开锁换锁'],
      commission_rate: 0.32,
      status: 1,
      remark: '测试数据'
    }),
    upsertByKey(Technician, { phone: '13890010003' }, {
      name: '测试师傅-郭师傅',
      specialties: ['测漏防水', '家具门窗'],
      commission_rate: 0.28,
      status: 1,
      remark: '测试数据'
    })
  ]);

  const [propertyA, propertyB, propertyC] = await Promise.all([
    upsertByKey(Property, { name: '测试物业A-先收款' }, {
      default_rate: 0.12,
      default_collection_party: 'property',
      settlement_cycle: 'monthly',
      status: 1,
      remark: '测试数据：物业先收款，月结'
    }),
    upsertByKey(Property, { name: '测试物业B-半月结' }, {
      default_rate: 0.08,
      default_collection_party: 'technician',
      settlement_cycle: 'half_month',
      status: 1,
      remark: '测试数据：半月结'
    }),
    upsertByKey(Property, { name: '测试物业C-低比例' }, {
      default_rate: 0.05,
      default_collection_party: 'technician',
      settlement_cycle: 'monthly',
      status: 1,
      remark: '测试数据：低比例'
    })
  ]);

  const [managerZhao, managerQian, managerSun] = await Promise.all([
    upsertByKey(BuildingManager, { name: '测试楼管-赵姐' }, {
      default_rate: 0.03,
      status: 1,
      remark: '测试数据：楼管激励'
    }),
    upsertByKey(BuildingManager, { name: '测试楼管-钱哥' }, {
      default_rate: 0.04,
      status: 1,
      remark: '测试数据：楼管激励'
    }),
    upsertByKey(BuildingManager, { name: '测试楼管-孙师傅' }, {
      default_rate: 0.02,
      status: 1,
      remark: '测试数据：楼管激励'
    })
  ]);

  const customers = await Promise.all([
    upsertByKey(Customer, { phone: '13990020001' }, { name: '测试客户-张阿姨', area: '新城区', address: '测试花园1号楼101', source_channel: '客户来电', tags: ['测试数据'], remark: '测试数据' }),
    upsertByKey(Customer, { phone: '13990020002' }, { name: '测试客户-李先生', area: '未央区', address: '测试物业A小区2号楼202', source_channel: '物业：测试物业A-先收款', tags: ['测试数据'], remark: '测试数据' }),
    upsertByKey(Customer, { phone: '13990020003' }, { name: '测试客户-王女士', area: '高新区', address: '测试物业B小区3号楼303', source_channel: '物业：测试物业B-半月结', tags: ['测试数据'], remark: '测试数据' }),
    upsertByKey(Customer, { phone: '13990020004' }, { name: '测试客户-赵先生', area: '灞桥区', address: '测试河岸4号楼404', source_channel: '楼管：测试楼管-赵姐', tags: ['测试数据'], remark: '测试数据' }),
    upsertByKey(Customer, { phone: '13990020005' }, { name: '测试客户-钱女士', area: '雁塔区', address: '测试中心5号楼505', source_channel: '老客介绍', tags: ['测试数据'], remark: '测试数据' }),
    upsertByKey(Customer, { phone: '13990020006' }, { name: '测试客户-孙先生', area: '碑林区', address: '测试街区6号楼606', source_channel: '微信', tags: ['测试数据'], remark: '测试数据' })
  ]);

  const orderCases = [
    {
      customer: customers[1], technician: techHan, property: propertyA, buildingManager: managerZhao,
      source: { type: 'property', id: propertyA.id, name: propertyA.name, channel: `物业：${propertyA.name}` },
      category: '水电维修', description: '物业A通知：厨房水龙头漏水',
      orderAmount: 680, materialCost: 120, technicianRate: 0.30, propertyRate: 0.12, buildingManagerRate: 0.03,
      collectionParty: 'property', propertySettlementStatus: 'unsettled', technicianSettlementStatus: 'unsettled', buildingManagerSettlementStatus: 'settled',
      completedDaysAgo: 2
    },
    {
      customer: customers[1], technician: techLi, property: propertyA, buildingManager: null,
      source: { type: 'property', id: propertyA.id, name: propertyA.name, channel: `物业：${propertyA.name}` },
      category: '下水疏通', description: '物业A通知：卫生间下水慢',
      orderAmount: 420, materialCost: 40, technicianRate: 0.32, propertyRate: 0.12,
      collectionParty: 'property', propertySettlementStatus: 'settled', technicianSettlementStatus: 'unsettled',
      completedDaysAgo: 5, status: 'callback'
    },
    {
      customer: customers[2], technician: techGuo, property: propertyB, buildingManager: managerQian,
      source: { type: 'property', id: propertyB.id, name: propertyB.name, channel: `物业：${propertyB.name}` },
      category: '测漏防水', description: '物业B通知：阳台渗水',
      orderAmount: 1280, materialCost: 360, technicianRate: 0.28, propertyRate: 0.08, buildingManagerRate: 0.04,
      collectionParty: 'technician', propertySettlementStatus: 'unsettled', technicianSettlementStatus: 'settled', buildingManagerSettlementStatus: 'unsettled',
      completedDaysAgo: 8
    },
    {
      customer: customers[3], technician: techHan, property: null, buildingManager: managerZhao,
      source: { type: 'building_manager', id: managerZhao.id, name: managerZhao.name, channel: `楼管：${managerZhao.name}` },
      category: '家电维修', description: '楼管赵姐推荐：洗衣机不排水',
      orderAmount: 560, materialCost: 90, technicianRate: 0.30, buildingManagerRate: 0.03,
      collectionParty: 'technician', technicianSettlementStatus: 'unsettled', buildingManagerSettlementStatus: 'unsettled',
      completedDaysAgo: 11
    },
    {
      customer: customers[4], technician: techLi, property: null, buildingManager: null,
      source: { type: 'customer', channel: '客户来电' },
      category: '开锁换锁', description: '客户来电：门锁损坏',
      orderAmount: 260, materialCost: 65, technicianRate: 0.32,
      collectionParty: 'technician', technicianSettlementStatus: 'settled',
      completedDaysAgo: 13, status: 'callback'
    },
    {
      customer: customers[5], technician: techGuo, property: propertyC, buildingManager: managerSun,
      source: { type: 'other', channel: '微信' },
      category: '家具门窗', description: '微信报修：柜门铰链脱落',
      orderAmount: 360, materialCost: 50, technicianRate: 0.28, propertyRate: 0.05, buildingManagerRate: 0.02,
      collectionParty: 'company', propertySettlementStatus: 'unsettled', technicianSettlementStatus: 'unsettled', buildingManagerSettlementStatus: 'unsettled',
      completedDaysAgo: 17
    },
    {
      customer: customers[0], technician: techHan, property: null, buildingManager: null,
      source: { type: 'customer', channel: '客户来电' },
      category: '家电清洗', description: '客户来电：油烟机清洗',
      orderAmount: 220, materialCost: 20, technicianRate: 0.30,
      collectionParty: 'technician', technicianSettlementStatus: 'unsettled',
      completedDaysAgo: 1
    },
    {
      customer: customers[2], technician: techLi, property: propertyB, buildingManager: null,
      source: { type: 'property', id: propertyB.id, name: propertyB.name, channel: `物业：${propertyB.name}` },
      category: '局部翻新', description: '物业B通知：墙面小面积修补',
      orderAmount: 900, materialCost: 260, technicianRate: 0.32, propertyRate: 0.08,
      collectionParty: 'technician', propertySettlementStatus: 'unsettled', technicianSettlementStatus: 'unsettled',
      completedDaysAgo: 22, receivedOffset: -50
    }
  ];

  for (let index = 0; index < orderCases.length; index += 1) {
    await createOrder({
      index: index + 1,
      receiverId,
      ...orderCases[index]
    });
  }

  for (const customer of customers) {
    const orders = await WorkOrder.findAll({ where: { customer_id: customer.id } });
    const orderIds = orders.map(item => item.id);
    const constructions = orderIds.length
      ? await Construction.findAll({ where: { order_id: orderIds } })
      : [];
    await customer.update({
      total_orders: orders.length,
      total_amount: constructions.reduce((sum, item) => sum + Number(item.order_amount || item.total_fee || 0), 0),
      last_order_at: orders.reduce((latest, item) => {
        const time = item.received_at ? new Date(item.received_at).getTime() : 0;
        return time > latest ? time : latest;
      }, 0) || null
    });
  }

  console.log('测试结算数据已写入：');
  console.log(`- 工单：${orderCases.length} 条，订单号前缀 ${TEST_PREFIX}`);
  console.log('- 物业：测试物业A-先收款、测试物业B-半月结、测试物业C-低比例');
  console.log('- 楼管：测试楼管-赵姐、测试楼管-钱哥、测试楼管-孙师傅');
  console.log('- 师傅：测试师傅-韩师傅、测试师傅-李师傅、测试师傅-郭师傅');
}

seed()
  .then(() => {
    sequelize.close();
  })
  .catch(error => {
    console.error('写入测试结算数据失败:', error);
    sequelize.close();
    process.exit(1);
  });
