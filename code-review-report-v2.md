# 乐修匠 — 二次审查报告

> 日期：2026-05-04  
> 对比首次 29 项问题，逐条核查修复状态

---

## 已修复 ✅（12 项）

| # | 原问题 | 修复内容 |
|---|--------|----------|
| 3 | 无请求频率限制 | 登录接口已加 `express-rate-limit`（15 分钟 10 次），`helmet` 安全头已配置 |
| 5 | 日志接口无分页 | `settings.js GET /logs` 已改为 `findAndCountAll` + limit/offset |
| 8 | 数据库缺少索引 | WorkOrder 新增 8 个索引（status、customer_id、receiver_id、area、created_at 等），Construction 新增 3 个，CallbackRecord 新增 3 个 |
| 11 | 客户删除缺权限 | `DELETE /customers/:id` 已加 `authAdmin` |
| 12 | 环境变量未校验 | `app.js` 启动时检查 `JWT_SECRET`，缺失直接 `process.exit(1)` |
| 17 | 未使用的 `literal` 导入 | `dashboard.js` 仍导入但实际在用（`fn('COUNT', literal('*')))`，不算问题） |
| 19 | 无密码强度验证 | `auth.js` 修改密码已校验 ≥8 位 + 字母 + 数字；`users.js` 重置密码同样校验 |
| 20 | 非 scoped 样式全局污染 | 所有组件的 `<style>` 均已加 `scoped`，CallbackList/ComplaintList 非 scoped 块已移除 |
| — | 无全局错误处理 | `app.js` 新增全局 error handler + `uncaughtException` / `unhandledRejection` 保护 |
| — | 无请求体大小限制 | `app.js` 新增 `express.json({ limit: '1mb' })` |
| — | Pinia settings store 加载标志 | `settings.js` 的 `loading` 已在 `finally` 块中重置 |
| — | 路由加载条清理 | `router.onError` 已加 `hideRouteLoading()`，afterEach 也调用 |

---

## 未修复 🚨（10 项）

### 🔴 严重

**1. SQL 注入风险 — 技师特长 + 多处 keyword 搜索**

`technicians.js:30` 仍然直接拼接：
```js
where.specialties = { [Op.like]: `%${specialty}%` };
```
同样 `keyword` 搜索在 `customers.js`、`workOrders.js`、`technicians.js` 中使用 `Op.like` + `%${keyword}%`，用户输入未转义 `_` 和 `%` 通配符。虽然 Sequelize 参数化了值，但 LIKE 通配符仍可被滥用做 ReDoS 或信息泄露。

**2. 全局输入验证缺失**

POST/PATCH 路由仍无统一验证中间件。`workOrders.js POST /` 不校验 customerId 类型、phone 格式、字符串长度等。

**3. 无 CSRF 防护**

`app.js` 未配置 CSRF 中间件。

---

### 🟠 高优先级

**4. N+1 查询 — workOrders 技师筛选**

`workOrders.js:19-28` 仍然是先查 Construction 再查 WorkOrder：
```js
const constructions = await Construction.findAll({
  where: { technician_id: technicianId },
  attributes: ['order_id']
});
const orderIds = constructions.map(c => c.order_id);
```
应改用 Sequelize `include` + `where` 一次查询。

**5. N+1 查询 — Dashboard 区域统计**

`dashboard.js:186-221` 仍然分 3 次查询（areaStats + areaRevenue + callbacks），再在内存中聚合。应合并为一次 JOIN + GROUP BY。

**6. 工单号并发风险**

`workOrders.js:346-349` 仍使用 4 位随机数：
```js
const randomPart = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
```
10000 种组合在高并发下仍会碰撞。

**7. 外键无级联约束**

`models/index.js` 所有 `belongsTo`/`hasMany` 关联均无 `onDelete` 选项。删除客户后工单成为孤立记录。

---

### 🟡 中优先级

**8. 重复派单路由**

`workOrders.js:411-497`，`/:id/assign` 和 `/:id/dispatch` 仍是两段几乎相同的代码。

**9. 硬编码业务阈值**

`workOrders.js:52-53` 仍硬编码 100 元：
```js
where: { total_fee: { [Op.gt]: 100 } }
```

**10. OrderDetail 过大**

`OrderDetail.vue` 仍有 1712 行，未拆分。

---

## 新增发现 🆕（6 项）

### 🟠 高优先级

**A. 重复状态更新路由**

`workOrders.js` 同时有 `PATCH /:id/status`（499-533 行）和 `PUT /:id/status`（536-570 行），逻辑完全相同。

**B. !important 严重泛滥**

全项目共 **681 处 `!important`**：
- `element-override.css`：365 处
- `global.scss`：179 处  
- 各组件 scoped 内：137 处

`element-override.css` 和 `global.scss` 中大量 `!important` 互相覆盖，长期维护困难。

### 🟡 中优先级

**C. Dashboard 统计端点查询过多**

`GET /dashboard` 一个接口内执行 8 次 `count/sum/findOne` 独立查询，应合并。

**D. 密码强度校验不一致**

- `auth.js` 修改密码：≥8 位 + 字母 + 数字 ✅
- `users.js` 创建用户：无密码强度校验 ❌
- `users.js` 重置密码：≥8 位 + 字母 + 数字 ✅

创建用户时密码可以是 "1"，但修改密码时不行，标准不统一。

**E. CustomerList 本月筛选客户端过滤**

`CustomerList.vue` 的"本月新增"筛选仍在客户端完成，应改为后端参数。

**F. 全局 rate-limit 仅限登录**

`express-rate-limit` 只在登录接口生效，其他 API（创建工单、查询列表等）无任何频率限制。

---

## 修复状态汇总

| 级别 | 首次 | 已修复 | 未修复 | 新增 | 剩余 |
|------|------|--------|--------|------|------|
| 🔴 严重 | 5 | 2 | 3 | 0 | 3 |
| 🟠 高优先 | 6 | 2 | 4 | 2 | 6 |
| 🟡 中优先 | 9 | 4 | 5 | 3 | 8 |
| 🔵 低优先 | 9 | 4 | 5 | 1 | 6 |
| **合计** | **29** | **12** | **17** | **6** | **23** |

修复率 41%，新增 6 项，净减少 6 项。

---

## 建议修复优先级

1. **SQL 注入 + 输入验证** → 引入 `express-validator`，所有 LIKE 查询转义通配符
2. **全局 rate-limit** → 对所有 `/api` 路由加通用限制（如 100 次/分钟）
3. **合并重复路由** → assign/dispatch 合一，PATCH/PUT status 合一
4. **N+1 查询** → workOrders 技师筛选改用 include，Dashboard area-stats 改用 JOIN
5. **工单号** → 改用 6 位随机或 UUID
6. **CSS 重构** → 减少 !important，通过选择器特异性解决优先级
7. **OrderDetail 拆分** → 提取客户信息、施工信息、回访信息为子组件
