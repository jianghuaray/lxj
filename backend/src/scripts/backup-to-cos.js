
require('dotenv').config();
const COS = require('cos-nodejs-sdk-v5');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execSync } = require('child_process');

const cos = new COS({
  SecretId: 'AKIDNq43Smtn5JI4dy6ze5IG0WnqhKq9HApH',
  SecretKey: 'FH5GI6FCwYyJXYKvQmtlYoubFn9KNK5g',
});

const BUCKET_NAME = 'lxj-1258962327';
const REGION = 'ap-beijing';
const DB_PATH = path.join(__dirname, '../../data/lexiujiang.db');
const BACKUP_DIR = path.join(__dirname, '../../backups');

async function backupToCos() {
  console.log('🚀 开始备份...');

  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ 数据库文件不存在:', DB_PATH);
    return;
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const localBackupPath = path.join(BACKUP_DIR, `lexiujiang-${timestamp}.db.gz`);

  console.log('📦 压缩数据库...');
  const input = fs.createReadStream(DB_PATH);
  const output = fs.createWriteStream(localBackupPath);
  await new Promise((resolve, reject) => {
    input.pipe(zlib.createGzip()).pipe(output)
      .on('finish', resolve)
      .on('error', reject);
  });
  console.log('✅ 压缩完成:', localBackupPath);

  const cosKey = `lexiujiang/${timestamp}/lexiujiang.db.gz`;
  console.log('☁️ 上传到COS...');
  await cos.putObject({
    Bucket: BUCKET_NAME,
    Region: REGION,
    Key: cosKey,
    Body: fs.createReadStream(localBackupPath),
  });
  console.log('✅ 上传成功:', cosKey);

  console.log('🧹 清理本地旧备份...');
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('lexiujiang-'))
    .sort()
    .reverse();
  const toDelete = files.slice(7);
  for (const f of toDelete) {
    fs.unlinkSync(path.join(BACKUP_DIR, f));
    console.log('   删除:', f);
  }
  console.log('✅ 本地清理完成');

  console.log('\n🎉 备份完成！');
}

backupToCos().catch(err => {
  console.error('❌ 备份失败:', err);
  process.exit(1);
});
