# 乐修匠 - 代码审查报告

> 审查范围：后端 (backend/src/) + 前端 (frontend/src/)  
> 审查重点：性能问题、代码质量  
> 日期：2026-05-04

---

## 🔴 严重问题（建议立即修复）

### 1. SQL 注入风险 — 技师特长筛选
**文件**: `backend/src/routes/technicians.js:35`

```js
where.specialties = { [Op.like]: `%${specialty}%` };
```

用户输入的 `specialty` 直接拼入 LIKE 查询，攻击者可注入恶意 SQL。应使用参数化查询或对输入进行转义。

### 2. 缺少输入验证
**文件**: 所有 POST/PATCH 路由（workOrders、customers、technicians 等）

请求体未做任何验证：字段必填、类型校验、长度限制、手机号格式等全部缺失。建议引入 `express-validator` 或 `joi`。

### 3. 缺少请求频率限制
**文件**: `backend/src/app.js`

未配置 `express-rate-limit`，登录接口可被暴力破解，所有接口可被 DDoS。

### 4. 缺少 CSRF 防护
**文件**: `backend/src/app.js`

未配置 CSRF 中间件，跨站请求伪造攻击可冒充已登录用户执行操作。

### 5. 操作日志接口无分页
**文件**: `backend/src/routes/settings.js` — `GET /logs`

```js
const logs = await OperationLog.findAll({ where, order: [['created_at', 'DESC']] });
```

一次性返回全部日志，数据量大时会导致内存溢出和响应超时。

---

## 🟠 高优先级问题（2 周内修复）

### 6. N+1 查询问题
**文件**: `backend/src/routes/dashboard.js:107-133`

区域满意度统计先查所有回访记录，再查所有工单映射区域，应改为 JOIN 一次查询。

**文件**: `backend/src/routes/workOrders.js:31-63`

按技师筛选时先查施工记录再查工单，应改为单次 JOIN 查询。

### 7. 数据库缺少索引
**文件**: `backend/src/models/` 所有模型

以下高频查询字段未建索引：
- `work_orders.customer_id`、`work_orders.status`
- `constructions.order_id`、`constructions.technician_id`
- `callback_records.order_id`

建议在模型定义中添加 `indexes` 配置。

### 8. 工单号并发冲突风险
**文件**: `backend/src/routes/workOrders.js:180-184`

```js
const randomPart = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
```

4 位随机数在高并发下碰撞概率不低。建议改用数据库序列或 UUID。

### 9. 外键缺少级联约束
**文件**: `backend/src/models/index.js`

```js
WorkOrder.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
// 缺少 onDelete/onUpdate 选项
```

删除客户后工单会成为孤立记录。应添加 `onDelete: 'RESTRICT'` 或 `'CASCADE'`。

### 10. 客户删除接口缺少权限校验
**文件**: `backend/src/routes/customers.js` — `DELETE /:id`

路由只加了 `auth` 中间件，未加 `authAdmin`，操作员也能删除客户。

### 11. 环境变量未校验
**文件**: `backend/src/app.js:1-7`

`JWT_SECRET` 等关键环境变量缺失时不会报错，服务器会以空密钥运行，安全隐患极大。

---

## 🟡 中优先级问题（1 个月内修复）

### 12. 工单模型冗余字段
**文件**: `backend/src/models/WorkOrder.js`

`customer_name`、`customer_phone` 与 Customer 表重复，客户信息更新后工单中的旧数据不会同步。应通过关联查询获取。

### 13. 重复代码 — 派单路由
**文件**: `backend/src/routes/workOrders.js:320-360`

`/:id/assign` 和 `/:id/dispatch` 实现完全相同，维护时需改两处。应合并为一条路由。

### 14. 硬编码业务值
**文件**: `backend/src/routes/workOrders.js:34`

```js
where: { total_fee: { [Op.gt]: 100 } }  // 100元硬编码
```

"待回访"阈值 100 元写死在代码中，应移到系统配置。

### 15. Dashboard 区域统计多次查询
**文件**: `backend/src/routes/dashboard.js:70-98`

区域统计用 3 次独立查询（工单统计、营收、满意度），应合并为一次 JOIN + GROUP BY。

### 16. 前端大组件未拆分
**文件**: `frontend/src/views/OrderDetail.vue`（1700+ 行）

单文件过于庞大，应拆分为客户信息、施工信息、回访信息等子组件。

### 17. v-for 使用 index 作 key
**文件**: `frontend/src/views/CustomerList.vue:102`

```html
<span v-for="(tag, i) in (customer.tags || []).slice(0, 3)" :key="tag" ...>
```

当列表项会增删时，index 作 key 会导致不必要的 DOM 重渲染。

### 18. CSS !important 滥用
**文件**: `frontend/src/styles/element-override.scss`、各组件的非 scoped 样式块

超过 50 处 `!important`，导致样式覆盖困难、优先级混乱。应通过提高选择器特异性替代。

### 19. 组件非 scoped 样式全局污染
**文件**: 多个 Vue 组件的第二个 `<style>` 块（无 scoped）

例如 `CallbackList.vue`、`ComplaintList.vue`、`OrderList.vue` 等都有非 scoped 的 Element Plus 覆盖样式，不同页面的覆盖规则互相冲突。应将 Element Plus 覆盖统一到 `element-override.scss`。

### 20. Pinia Store 异常处理不完整
**文件**: `frontend/src/stores/settings.js`

`loading` 标志在 catch 块中未重置为 false，请求失败后 UI 永远处于加载状态。

---

## 🔵 低优先级问题（后续优化）

### 21. 未使用的导入
**文件**: `backend/src/routes/dashboard.js:1`

`literal` 被导入但未使用。

### 22. API 设计不一致
**文件**: `backend/src/routes/customers.js`

同时存在 `PUT /:id`、`PATCH /:id`、`PATCH /:id/level`、`PATCH /:id/tags`，语义重叠，应统一。

### 23. 前端路由加载条清理
**文件**: `frontend/src/router/index.js`

导航守卫中 `hideRouteLoading()` 在 `next()` 后立即调用，加载条可能一闪而过；取消导航时未清理 DOM 节点。

### 24. 无请求重试机制
**文件**: `frontend/src/utils/api.js`

网络短暂波动时请求直接失败，无自动重试。可对 GET 请求添加 1-2 次重试。

### 25. 缺少 Token 刷新机制
**文件**: `frontend/src/utils/api.js` + `backend/src/routes/auth.js`

JWT 过期后用户需重新登录，应实现 Refresh Token 静默续期。

### 26. 客户端筛选大数据量
**文件**: `frontend/src/views/CustomerList.vue`

"本月新增"筛选在前端完成，数据量大时应改为后端参数过滤。

### 27. Excel 导出列宽计算
**文件**: `frontend/src/utils/exportExcel.js`

仅采样前 50 行计算列宽，超长文本可能溢出。

### 28. 密码强度无要求
**文件**: `backend/src/routes/users.js:59`

创建用户时不校验密码复杂度。

### 29. JSON 字段无验证
**文件**: `backend/src/models/Customer.js`、`Technician.js`

`tags`、`specialties` 等 JSON 字段无结构验证，可写入任意数据。

---

## 📊 问题统计

| 严重级别 | 数量 | 关键词 |
|---------|------|--------|
| 🔴 严重 | 5 | SQL注入、输入验证、频率限制、CSRF、无分页 |
| 🟠 高优先 | 6 | N+1查询、缺索引、并发、外键、权限、环境变量 |
| 🟡 中优先 | 9 | 冗余字段、重复代码、硬编码、大组件、!important |
| 🔵 低优先 | 9 | 未用导入、API设计、Token刷新、客户端筛选等 |
| **合计** | **29** | |

---

## 建议修复顺序

1. **安全加固**：输入验证 → 频率限制 → CSRF → SQL注入 → 权限校验
2. **性能优化**：添加索引 → 修复 N+1 → 分页 → 合并查询
3. **代码质量**：合并重复路由 → 消除硬编码 → 统一样式覆盖 → 拆分大组件
4. **体验提升**：Token刷新 → 请求重试 → 加载状态完善
