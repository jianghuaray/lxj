require('dotenv').config();
const XLSX = require('xlsx');
const { sequelize, User, Customer, Technician, WorkOrder, Construction, CallbackRecord, Settings } = require('../models');

const EXCEL_PATH = process.argv[2] || '/Users/sui/Desktop/乐修匠服务信息记录_副本.xlsx';

const STATUS_MAP = {
  '已完成': 'completed',
  '取消单': 'cancelled',
  '咨询单': 'consultation',
  '跟进中': 'dispatched'
};

const CALLBACK_METHOD_MAP = {
  '电话': 'phone',
  '微信': 'wechat',
  '上门': 'visit'
};

function excelDateToDate(serial) {
  if (!serial) return null;
  if (serial instanceof Date) return serial;
  if (typeof serial === 'number') {
    const utc_days = Math.floor(serial - 25569);
    const utc_val = utc_days * 86400;
    return new Date(utc_val * 1000);
  }
  if (typeof serial === 'string') {
    const d = new Date(serial);
    if (!isNaN(d.getTime())) return d;
    const parts = serial.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/);
    if (parts) return new Date(parts[1], parts[2] - 1, parts[3]);
    return null;
  }
  return null;
}

function parseBool(val) {
  if (val === '是' || val === 1 || val === true) return 1;
  if (val === '否' || val === 0 || val === false) return 0;
  return null;
}

function parseSatisfaction(val) {
  if (val === '满意') return 5;
  if (val === '一般') return 3;
  if (val === '不满意') return 1;
  const n = parseInt(val);
  if (n >= 1 && n <= 5) return n;
  return null;
}

function safeStr(val) {
  if (val === null || val === undefined) return null;
  return String(val).trim() || null;
}

function safePhone(val) {
  if (!val) return null;
  const s = String(val).trim();
  if (s === '微信沟通' || s === '微信' || isNaN(Number(s))) return null;
  return s;
}

async function importData() {
  console.log('正在读取 Excel 文件:', EXCEL_PATH);
  const wb = XLSX.readFile(EXCEL_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  console.log('正在连接数据库...');
  await sequelize.authenticate();
  console.log('数据库连接成功！');

  const technicianCache = {};
  const customerCache = {};
  let importedOrders = 0;
  let importedCustomers = 0;
  let importedTechnicians = 0;
  let importedConstructions = 0;
  let importedCallbacks = 0;
  let skippedRows = 0;

  const existingTechnicians = await Technician.findAll();
  for (const t of existingTechnicians) {
    technicianCache[t.name] = t;
  }
  console.log(`已有师傅: ${Object.keys(technicianCache).length} 个`);

  const existingCustomers = await Customer.findAll();
  for (const c of existingCustomers) {
    customerCache[c.phone] = c;
  }
  console.log(`已有客户: ${Object.keys(customerCache).length} 个`);

  const operatorUser = await User.findOne({ where: { username: 'operator' } });
  const receiverId = operatorUser ? operatorUser.id : 2;

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0]) continue;

    const orderNo = String(row[0]).trim();
    const statusText = safeStr(row[1]);
    const customerName = safeStr(row[2]);
    const customerPhone = safePhone(row[3]);
    const area = safeStr(row[4]);
    const address = safeStr(row[5]);
    const sourceChannel = safeStr(row[6]);
    const problemCategory = safeStr(row[7]);
    const problemDescription = safeStr(row[8]);
    const receivedAtSerial = row[9];
    const completedAtSerial = row[10];
    const receiverRemark = safeStr(row[11]);
    const cancelReason = safeStr(row[12]);
    const techName = safeStr(row[13]);
    const totalFee = row[14] != null ? parseFloat(row[14]) : null;
    const serviceFee = row[15] != null ? parseFloat(row[15]) : null;
    const receivedFee = row[16] != null ? parseFloat(row[16]) : null;
    const materialCost = row[17] != null ? parseFloat(row[17]) : null;
    const commissionRate = row[18] != null ? parseFloat(row[18]) : null;
    const buildingManagerIncentive = row[19] != null ? parseFloat(row[19]) : null;
    const actualWork = safeStr(row[20]);
    const isSatisfied = row[21] != null ? parseBool(row[21]) : null;
    const satisfactionScore = row[22] != null ? parseSatisfaction(row[22]) : null;
    const feeConsistent = row[23] != null ? parseBool(row[23]) : null;
    const callbackMethod = row[24] != null ? (CALLBACK_METHOD_MAP[safeStr(row[24])] || safeStr(row[24])) : null;
    const callbackByName = safeStr(row[25]);
    const otherFeedback = safeStr(row[26]);
    const callbackAtStr = safeStr(row[27]);

    const status = STATUS_MAP[statusText] || 'pending';
    const receivedAt = excelDateToDate(receivedAtSerial);
    const completedAt = excelDateToDate(completedAtSerial);

    if (!customerName && !customerPhone) {
      console.log(`跳过行${i}: 无客户信息, 订单号=${orderNo}`);
      skippedRows++;
      continue;
    }

    let customer;
    const phoneKey = customerPhone || `no_phone_${customerName}_${area}`;
    if (customerCache[phoneKey]) {
      customer = customerCache[phoneKey];
    } else {
      try {
        customer = await Customer.create({
          name: customerName || '未知',
          phone: customerPhone || `unknown_${Date.now()}_${i}`,
          area: area,
          address: address,
          level: 'normal',
          source_channel: sourceChannel,
          remark: null
        });
        customerCache[phoneKey] = customer;
        importedCustomers++;
      } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
          customer = await Customer.findOne({ where: { phone: customerPhone } });
          customerCache[phoneKey] = customer;
        } else {
          console.log(`行${i}: 创建客户失败 - ${err.message}`);
          skippedRows++;
          continue;
        }
      }
    }

    let technician = null;
    if (techName) {
      if (technicianCache[techName]) {
        technician = technicianCache[techName];
      } else {
        try {
          technician = await Technician.create({
            name: techName,
            phone: `pending_${Date.now()}_${i}`,
            specialties: [problemCategory].filter(Boolean),
            commission_rate: commissionRate || 0.30,
            status: 1,
            remark: '从Excel导入'
          });
          technicianCache[techName] = technician;
          importedTechnicians++;
        } catch (err) {
          if (err.name === 'SequelizeUniqueConstraintError') {
            technician = await Technician.findOne({ where: { name: techName } });
            technicianCache[techName] = technician;
          } else {
            console.log(`行${i}: 创建师傅失败 - ${err.message}`);
          }
        }
      }
    }

    const existingOrder = await WorkOrder.findOne({ where: { order_no: orderNo } });
    if (existingOrder) {
      console.log(`跳过: 订单号 ${orderNo} 已存在`);
      skippedRows++;
      continue;
    }

    const order = await WorkOrder.create({
      order_no: orderNo,
      status: status,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_phone: customer.phone,
      area: area,
      address: address,
      source_channel: sourceChannel,
      problem_category: problemCategory || '其他',
      problem_description: problemDescription,
      receiver_id: receiverId,
      received_at: receivedAt,
      completed_at: completedAt,
      receiver_remark: receiverRemark,
      cancel_reason: status === 'cancelled' ? (cancelReason || '客户取消') : null
    });
    importedOrders++;

    if (technician && (totalFee != null || serviceFee != null)) {
      const dispatchedAt = receivedAt || new Date();
      await Construction.create({
        order_id: order.id,
        technician_id: technician.id,
        total_fee: totalFee,
        service_fee: serviceFee,
        received_fee: receivedFee,
        material_cost: materialCost,
        commission_rate: commissionRate || technician.commission_rate,
        building_manager_incentive: buildingManagerIncentive || 0,
        actual_work: actualWork,
        dispatch_remark: null,
        dispatched_at: dispatchedAt,
        started_at: dispatchedAt
      });
      importedConstructions++;
    }

    if (isSatisfied != null || satisfactionScore != null || otherFeedback) {
      let callbackBy = null;
      if (callbackByName) {
        const callbackUser = await User.findOne({ where: { real_name: { [require('sequelize').Op.like]: `%${callbackByName}%` } } });
        if (callbackUser) callbackBy = callbackUser.id;
      }

      const callbackAt = callbackAtStr ? excelDateToDate(callbackAtStr) : (completedAt || receivedAt);

      await CallbackRecord.create({
        order_id: order.id,
        is_satisfied: isSatisfied != null ? isSatisfied : (satisfactionScore >= 4 ? 1 : 0),
        satisfaction_score: satisfactionScore,
        fee_consistent: feeConsistent,
        callback_method: callbackMethod,
        callback_by: callbackBy,
        other_feedback: otherFeedback,
        callback_at: callbackAt
      });
      importedCallbacks++;
    }

    if (status === 'completed' || status === 'callback') {
      await customer.increment('total_orders');
      if (totalFee) {
        await customer.increment('total_amount', { by: totalFee });
      }
      if (completedAt) {
        await customer.update({ last_order_at: completedAt });
      }
    }
  }

  const allTechnicians = await Technician.findAll();
  for (const t of allTechnicians) {
    if (t.phone.startsWith('pending_')) {
      const count = await Construction.count({ where: { technician_id: t.id } });
      if (count > 0) {
        await t.update({ phone: `13800${String(t.id).padStart(6, '0')}` });
      } else {
        await t.destroy();
      }
    }
  }

  const allAreas = await WorkOrder.findAll({
    attributes: [[sequelize.fn('DISTINCT', sequelize.col('area')), 'area']],
    raw: true,
    where: { area: { [require('sequelize').Op.ne]: null } }
  });
  const areaValues = allAreas.map(a => a.area).filter(Boolean);
  const existingAreas = await Settings.findOne({ where: { category: 'serviceAreas' } });
  if (existingAreas) {
    const merged = [...new Set([...existingAreas.values, ...areaValues])];
    await existingAreas.update({ values: merged });
  }

  const allChannels = await WorkOrder.findAll({
    attributes: [[sequelize.fn('DISTINCT', sequelize.col('source_channel')), 'source_channel']],
    raw: true,
    where: { source_channel: { [require('sequelize').Op.ne]: null } }
  });
  const channelValues = allChannels.map(c => c.source_channel).filter(Boolean);
  const existingChannels = await Settings.findOne({ where: { category: 'sourceChannels' } });
  if (existingChannels) {
    const merged = [...new Set([...existingChannels.values, ...channelValues])];
    await existingChannels.update({ values: merged });
  }

  console.log('\n========== 导入完成 ==========');
  console.log(`新增客户: ${importedCustomers}`);
  console.log(`新增师傅: ${importedTechnicians}`);
  console.log(`新增工单: ${importedOrders}`);
  console.log(`新增施工记录: ${importedConstructions}`);
  console.log(`新增回访记录: ${importedCallbacks}`);
  console.log(`跳过行数: ${skippedRows}`);

  process.exit(0);
}

importData().catch(err => {
  console.error('导入失败:', err);
  process.exit(1);
});
