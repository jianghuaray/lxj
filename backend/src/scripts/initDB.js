require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User, Technician, Customer, WorkOrder, Construction, CallbackRecord, Settings, OperationLog } = require('../models');

const initDB = async () => {
  try {
    console.log('正在连接数据库...');
    await sequelize.authenticate();
    console.log('数据库连接成功！');

    console.log('正在同步数据库...');
    await sequelize.sync({ force: true });
    console.log('数据库同步成功！');

    // 插入初始数据
    console.log('正在插入初始数据...');

    // 创建管理员用户
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await User.create({
      username: 'admin',
      password: hashedPassword,
      real_name: '系统管理员',
      role: 'admin',
      status: 1
    });

    // 创建普通用户
    const hashedPassword2 = await bcrypt.hash('123456', 10);
    await User.create({
      username: 'operator',
      password: hashedPassword2,
      real_name: '张小明',
      role: 'operator',
      status: 1
    });

    // 创建一些示例师傅
    const technicians = await Promise.all([
      Technician.create({
        name: '韩胜涛',
        phone: '13800138001',
        specialties: ['水电维修', '家电维修'],
        commission_rate: 0.30,
        status: 1,
        remark: '技术熟练，经验丰富'
      }),
      Technician.create({
        name: '李朝',
        phone: '13800138002',
        specialties: ['下水疏通', '开锁换锁'],
        commission_rate: 0.30,
        status: 1,
        remark: '工作认真负责'
      }),
      Technician.create({
        name: '巴焱',
        phone: '13800138003',
        specialties: ['家电维修', '家具门窗'],
        commission_rate: 0.30,
        status: 1,
        remark: ''
      }),
      Technician.create({
        name: '郭富杰',
        phone: '13800138004',
        specialties: ['水电维修', '测漏防水'],
        commission_rate: 0.30,
        status: 1,
        remark: ''
      }),
      Technician.create({
        name: '张华',
        phone: '13800138005',
        specialties: ['家具门窗', '局部翻新'],
        commission_rate: 0.30,
        status: 1,
        remark: ''
      })
    ]);

    // 创建一些示例客户
    const customers = await Promise.all([
      Customer.create({
        name: '张三',
        phone: '13900139001',
        area: '新城区',
        address: '幸福花园1号楼2单元301室',
        level: 'normal',
        tags: ['周末预约'],
        source_channel: '社区宣传',
        remark: '老人独居，需要耐心沟通'
      }),
      Customer.create({
        name: '李四',
        phone: '13900139002',
        area: '未央区',
        address: '阳光小区5号楼3单元402室',
        level: 'vip',
        tags: ['老客户'],
        source_channel: '客户推荐'
      }),
      Customer.create({
        name: '王五',
        phone: '13900139003',
        area: '高新区',
        address: '科技园区B栋201室',
        level: 'normal',
        tags: [],
        source_channel: '线上推广'
      }),
      Customer.create({
        name: '赵六',
        phone: '13900139004',
        area: '灞桥区',
        address: '河边小区3号楼1单元101室',
        level: 'normal',
        tags: [],
        source_channel: '其他'
      }),
      Customer.create({
        name: '钱七',
        phone: '13900139005',
        area: '新城区',
        address: '新天地小区8号楼4单元503室',
        level: 'vip',
        tags: ['老客户', '价格敏感'],
        source_channel: '社区宣传'
      }),
      Customer.create({
        name: '孙八',
        phone: '13900139006',
        area: '未央区',
        address: '丽景花园12号楼2单元201室',
        level: 'normal',
        tags: [],
        source_channel: '客户推荐'
      }),
      Customer.create({
        name: '周九',
        phone: '13900139007',
        area: '高新区',
        address: '软件园A座601室',
        level: 'normal',
        tags: [],
        source_channel: '线上推广'
      }),
      Customer.create({
        name: '吴十',
        phone: '13900139008',
        area: '灞桥区',
        address: '河岸人家2号楼3单元302室',
        level: 'normal',
        tags: [],
        source_channel: '其他'
      })
    ]);

    // 生成一些示例工单
    const now = new Date();
    const orders = [];
    const statuses = ['pending', 'dispatched', 'working', 'completed', 'callback', 'cancelled', 'consultation'];
    const categories = ['水电维修', '下水疏通', '家具门窗', '家电维修', '家电清洗', '测漏防水', '开锁换锁', '局部翻新'];
    const channels = ['社区宣传', '客户推荐', '线上推广', '其他'];
    const areas = ['新城区', '未央区', '高新区', '灞桥区'];
    const cancelReasons = ['客户主动取消', '价格原因取消', '师傅无法施工', '联系不上客户', '其他'];

    for (let i = 1; i <= 30; i++) {
      const orderDate = new Date(now);
      orderDate.setDate(now.getDate() - Math.floor(Math.random() * 30));
      
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      const orderNo = `${orderDate.getFullYear()}${String(orderDate.getMonth() + 1).padStart(2, '0')}${String(orderDate.getDate()).padStart(2, '0')}${String(i).padStart(4, '0')}`;
      
      const order = await WorkOrder.create({
        order_no: orderNo,
        status: status,
        customer_id: customer.id,
        customer_name: customer.name,
        customer_phone: customer.phone,
        area: customer.area,
        address: customer.address,
        source_channel: channels[Math.floor(Math.random() * channels.length)],
        problem_category: categories[Math.floor(Math.random() * categories.length)],
        problem_description: `${customer.name}家的${categories[Math.floor(Math.random() * categories.length)]}问题需要处理`,
        receiver_id: 2,
        received_at: orderDate,
        completed_at: ['completed', 'callback'].includes(status) ? new Date(orderDate.getTime() + Math.random() * 86400000 * 3) : null,
        cancel_reason: status === 'cancelled' ? cancelReasons[Math.floor(Math.random() * cancelReasons.length)] : null,
        receiver_remark: Math.random() > 0.5 ? '客户比较着急' : ''
      });
      orders.push(order);

      // 如果是已派单及以后的状态，创建施工记录
      if (['dispatched', 'working', 'completed', 'callback'].includes(status)) {
        const technician = technicians[Math.floor(Math.random() * technicians.length)];
        const dispatchedAt = new Date(orderDate.getTime() + Math.random() * 86400000);
        const startedAt = ['working', 'completed', 'callback'].includes(status) ? new Date(dispatchedAt.getTime() + Math.random() * 86400000) : null;
        const totalFee = Math.floor(Math.random() * 800) + 200;
        const serviceFee = Math.floor(totalFee * 0.3);
        
        await Construction.create({
          order_id: order.id,
          technician_id: technician.id,
          total_fee: totalFee,
          service_fee: serviceFee,
          received_fee: status === 'callback' ? serviceFee : Math.floor(Math.random() * serviceFee),
          material_cost: Math.floor(Math.random() * 200),
          commission_rate: technician.commission_rate,
          building_manager_incentive: Math.random() > 0.7 ? Math.floor(Math.random() * 100) : 0,
          actual_work: '已完成维修工作',
          dispatch_remark: Math.random() > 0.5 ? '请师傅尽快上门' : '',
          dispatched_at: dispatchedAt,
          started_at: startedAt
        });

        // 如果是已回访状态，创建回访记录
        if (status === 'callback') {
          const satisfactionScore = Math.floor(Math.random() * 3) + 3;
          await CallbackRecord.create({
            order_id: order.id,
            is_satisfied: satisfactionScore >= 4 ? 1 : 0,
            satisfaction_score: satisfactionScore,
            fee_consistent: Math.random() > 0.2 ? 1 : 0,
            callback_method: ['phone', 'wechat', 'visit'][Math.floor(Math.random() * 3)],
            callback_by: 2,
            other_feedback: satisfactionScore >= 4 ? '客户表示满意' : '客户有一些意见',
            callback_at: new Date(now.getTime() - Math.random() * 86400000 * 5)
          });
        }
      }
    }

    // 初始化系统配置
    await Promise.all([
      Settings.create({ category: 'serviceTypes', values: ['水电维修', '下水疏通', '家具门窗', '家电维修', '家电清洗', '测漏防水', '开锁换锁', '局部翻新'] }),
      Settings.create({ category: 'serviceAreas', values: ['新城区', '未央区', '高新区', '灞桥区', '雁塔区', '碑林区', '莲湖区'] }),
      Settings.create({ category: 'sourceChannels', values: ['电话', '微信', '楼管推荐', '老客介绍', '线上平台', '其他'] }),
      Settings.create({ category: 'cancelReasons', values: ['客户取消', '信息错误', '重复下单', '超出服务范围', '无法联系客户', '其他'] })
    ]);

    console.log('初始数据插入成功！');
    console.log('');
    console.log('默认账号信息：');
    console.log('  管理员账号: admin / admin123');
    console.log('  接线员账号: operator / 123456');
    console.log('');
    console.log('数据库初始化完成！');

    process.exit(0);
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  }
};

initDB();
