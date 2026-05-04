# 乐修匠 — 服务器部署指南

## 前置要求

- Node.js >= 18
- PM2: `npm install -g pm2`
- Nginx（推荐，也可不使用，后端直接服务前端静态文件）

## 1. 上传代码

```bash
# 将项目上传到服务器
scp -r ./lxj root@your-server:/opt/lexiujiang
```

## 2. 安装依赖

```bash
cd /opt/lexiujiang/backend
npm install --production

cd /opt/lexiujiang/frontend
npm install
npm run build
```

## 3. 配置环境变量

```bash
cd /opt/lexiujiang/backend
cp .env.example .env
# 编辑 .env，修改以下内容：
#   JWT_SECRET=随机强密码（至少32位）
#   FRONTEND_URL=http://你的域名或IP
#   NODE_ENV=production
```

## 4. 初始化数据库

```bash
cd /opt/lexiujiang/backend
npm run init:db
```

## 5. 使用 PM2 启动后端

```bash
cd /opt/lexiujiang
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup  # 开机自启
```

## 6. 配置 Nginx（推荐）

```bash
# 复制配置文件
cp nginx.conf.example /etc/nginx/sites-available/lexiujiang
ln -s /etc/nginx/sites-available/lexiujiang /etc/nginx/sites-enabled/

# 修改 server_name 为你的域名或 IP
vim /etc/nginx/sites-available/lexiujiang

# 测试并重载
nginx -t && nginx -s reload
```

## 7. 不使用 Nginx（简单方案）

后端已内置静态文件服务，`NODE_ENV=production` 时会自动服务 `frontend/dist`。
直接访问 `http://你的IP:3000` 即可。

## 常用命令

```bash
pm2 logs lexiujiang    # 查看日志
pm2 restart lexiujiang # 重启
pm2 stop lexiujiang    # 停止
pm2 monit              # 监控面板
```
