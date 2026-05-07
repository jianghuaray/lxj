require('dotenv').config();
const XLSX = require('xlsx');
const { sequelize, Volunteer, VolunteerService } = require('../models');

const EXCEL_PATH = process.argv[2] || '/tmp/志愿者信息.xlsx';

function excelDateToDate(serial) {
  if (!serial) return null;
  if (serial instanceof Date) return serial;
  if (typeof serial === 'number') {
    const utc_days = Math.floor(serial - 25569);
    const utc_val = utc_days * 86400;
    return new Date(utc_val * 1000).toISOString().split('T')[0];
  }
  if (typeof serial === 'string') {
    const d = new Date(serial);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  return null;
}

function safeStr(val) {
  if (val === null || val === undefined) return null;
  return String(val).trim() || null;
}

function parseGender(val) {
  const s = safeStr(val);
  if (!s) return 'male';
  if (s.includes('女')) return 'female';
  return 'male';
}

function parsePoliticalStatus(val) {
  const s = safeStr(val) || '群众';
  if (s.includes('党员')) return 'party';
  if (s.includes('团员')) return 'league';
  return 'mass';
}

async function importData() {
  console.log('正在读取 Excel 文件:', EXCEL_PATH);
  const wb = XLSX.readFile(EXCEL_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  console.log('正在连接数据库...');
  await sequelize.authenticate();
  console.log('数据库连接成功！');

  let importedVolunteers = 0;
  let importedServices = 0;
  let skippedRows = 0;

  const existingVolunteers = await Volunteer.findAll();
  const phoneCache = {};
  for (const v of existingVolunteers) {
    phoneCache[v.phone] = v;
  }
  console.log('已有志愿者: ' + Object.keys(phoneCache).length + ' 个');

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[1]) continue;

    const name = safeStr(row[1]);
    const phone = String(row[2] || '').trim();
    const age = parseInt(row[3]) || 0;
    const gender = parseGender(row[4]);
    const politicalStatus = parsePoliticalStatus(row[5]) || 'mass';
    const community = safeStr(row[6]) || '未填写';
    const address = safeStr(row[7]);
    const specialty = safeStr(row[8]);
    const serviceIntention = safeStr(row[9]);

    if (!name) {
      console.log('跳过行' + (i+1) + ': 无姓名');
      skippedRows++;
      continue;
    }

    let volunteer;
    if (phoneCache[phone]) {
      volunteer = phoneCache[phone];
    } else {
      try {
        volunteer = await Volunteer.create({
          name: name,
          phone: phone || 'unknown_' + Date.now() + '_' + i,
          age: age || 0,
          gender: gender || 'male',
          politicalStatus: politicalStatus || 'mass',
          community: community || '未填写',
          address: address,
          specialty: specialty,
          serviceIntention: serviceIntention
        });
        phoneCache[phone] = volunteer;
        importedVolunteers++;
      } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
          volunteer = await Volunteer.findOne({ where: { phone: phone } });
          phoneCache[phone] = volunteer;
        } else {
          console.log('行' + (i+1) + ': 创建志愿者失败 - ' + err.message);
          skippedRows++;
          continue;
        }
      }
    }
  }

  console.log('\n========== 导入完成 ==========');
  console.log('新增志愿者: ' + importedVolunteers);
  console.log('新增服务记录: ' + importedServices);
  console.log('跳过行数: ' + skippedRows);

  process.exit(0);
}

importData().catch(err => {
  console.error('导入失败:', err);
  process.exit(1);
});
