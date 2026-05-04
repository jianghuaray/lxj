#!/bin/bash
set -e

SERVER_IP="49.232.164.77"
SERVER_USER="ubuntu"
SSH_KEY="/Users/sui/Desktop/lexiujiang.pem"
REMOTE_DIR="/opt/lexiujiang"
SSH_CMD="ssh -i $SSH_KEY -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP}"
SCP_CMD="scp -i $SSH_KEY -o StrictHostKeyChecking=no"

echo "🚀 开始部署乐修匠系统到服务器..."
echo ""

echo "📦 1/5 打包项目代码..."
cd "$(dirname "$0")"
tar czf /tmp/lexiujiang-deploy.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='design-v2' \
  --exclude='.workbuddy' \
  --exclude='*.md' \
  --exclude='*.log' \
  --exclude='frontend/dist' \
  backend frontend ecosystem.config.cjs nginx.conf.example
echo "   打包完成"

echo "📤 2/5 上传到服务器..."
$SCP_CMD /tmp/lexiujiang-deploy.tar.gz ${SERVER_USER}@${SERVER_IP}:/tmp/
echo "   上传完成"

echo "📂 3/5 解压并安装依赖..."
$SSH_CMD "cd $REMOTE_DIR && tar xzf /tmp/lexiujiang-deploy.tar.gz && echo '解压完成'"

$SSH_CMD "cd $REMOTE_DIR/backend && npm install --omit=dev 2>&1 | tail -1"
echo "   后端依赖完成"

$SSH_CMD "cd $REMOTE_DIR/frontend && npm install 2>&1 | tail -1 && npm run build 2>&1 | tail -1"
echo "   前端构建完成"

echo "🔄 4/5 重启服务..."
$SSH_CMD "cd $REMOTE_DIR && pm2 restart lexiujiang 2>&1 | tail -1"
echo "   服务已重启"

echo "✅ 5/5 验证部署..."
sleep 2
HEALTH=$($SSH_CMD "curl -s http://localhost:3001/api/health")
if [ "$HEALTH" = '{"status":"ok"}' ]; then
  echo "   后端运行正常 ✓"
else
  echo "   ⚠️ 后端可能有问题，请检查日志: pm2 logs lexiujiang"
fi

NGINX_CHECK=$($SSH_CMD "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/")
if [ "$NGINX_CHECK" = "200" ]; then
  echo "   前端运行正常 ✓"
else
  echo "   ⚠️ 前端可能有问题，Nginx返回: $NGINX_CHECK"
fi

echo ""
echo "🎉 部署完成！访问: http://${SERVER_IP}:3000"
