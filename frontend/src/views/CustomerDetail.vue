<template>
  <div class="customer-detail-page">
    <!-- ===== 1. Back + Title ===== -->
    <div class="detail-header">
      <div class="detail-header-left">
        <button class="btn-back" @click="$router.back()">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="15 18 9 12 15 6"/></svg>
          返回客户列表
        </button>
        <h2 class="page-title">客户档案 - {{ customer.name || '未知' }}</h2>
      </div>
      <div class="detail-header-right">
        <button class="btn-pill primary" @click="showEditDialog = true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
          编辑信息
        </button>
        <button class="btn-pill secondary-outline" @click="showLevelDialog = true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
          调整等级
        </button>
      </div>
    </div>

    <!-- ===== 2. Customer Overview Card ===== -->
    <div class="overview-card">
      <div class="overview-left">
        <div class="customer-avatar">{{ customer.name?.charAt(0) || '?' }}</div>
        <div class="customer-info">
          <div class="customer-name">{{ customer.name || '-' }}</div>
          <div class="customer-phone">{{ customer.phone || '-' }}</div>
          <div class="customer-badges">
            <span class="vip-badge" v-if="customer.level === 'vip'">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              VIP客户
            </span>
            <span v-for="tag in (customer.tags || [])" :key="tag" class="tag-pill">{{ tag }}</span>
          </div>
        </div>
      </div>
      <div class="overview-right">
        <div class="stat-item">
          <div class="stat-value">{{ customer.totalOrders || 0 }}<span class="unit">单</span></div>
          <div class="stat-label">累计工单</div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <div class="stat-value">¥{{ formatCurrency(customer.totalAmount || 0) }}</div>
          <div class="stat-label">累计消费</div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <div class="stat-value">{{ customer.avgSatisfaction || '-' }}<span class="unit">分</span></div>
          <div class="stat-label">平均满意度</div>
        </div>
      </div>
    </div>

    <!-- ===== 3. Two Column Layout ===== -->
    <div class="two-col-layout">
      <!-- Left Column (2/3) -->
      <div class="left-col">
        <!-- Basic Info Card -->
        <div class="detail-card">
          <div class="card-title">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
            基本信息
          </div>
          <div class="field-list">
            <div class="field-row">
              <span class="field-label">区域</span>
              <span class="field-value">{{ customer.area || '-' }}</span>
            </div>
            <div class="field-row">
              <span class="field-label">详细地址</span>
              <span class="field-value">{{ customer.address || '-' }}</span>
            </div>
            <div class="field-row">
              <span class="field-label">首次来源</span>
              <span class="field-value">{{ customer.sourceChannel || '-' }}</span>
            </div>
            <div class="field-row">
              <span class="field-label">注册时间</span>
              <span class="field-value">{{ formatDate(customer.createdAt) || '-' }}</span>
            </div>
            <div class="field-row">
              <span class="field-label">最近报修</span>
              <span class="field-value">{{ formatDate(customer.lastOrderAt) || '-' }}</span>
            </div>
            <div class="field-row" v-if="customer.remark">
              <span class="field-label">备注/偏好</span>
              <span class="field-value note">{{ customer.remark }}</span>
            </div>
          </div>
        </div>

        <!-- Order History Card -->
        <div class="table-wrapper">
          <div class="card-title">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
            工单历史
          </div>
          <table class="history-table">
            <thead>
              <tr>
                <th>订单号</th>
                <th>问题分类</th>
                <th>状态</th>
                <th>费用</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in orders" :key="order.id">
                <td><a class="order-id-link" @click="$router.push(`/orders/${order.id}`)">{{ order.orderNo }}</a></td>
                <td><span class="category-pill">{{ order.problemCategory }}</span></td>
                <td><span class="status-badge" :class="getStatusClass(order.status)">{{ getStatusText(order.status) }}</span></td>
                <td class="cost-value">¥{{ formatCurrency(order.totalFee || 0) }}</td>
                <td>{{ formatDate(order.createdAt) }}</td>
              </tr>
              <tr v-if="orders.length === 0">
                <td colspan="5" class="empty-state-small">暂无工单记录</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Right Column (1/3) -->
      <div class="right-col">
        <!-- Customer Level Card -->
        <div class="level-card">
          <div class="card-title">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 6 9 6 9Z"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 18 9 18 9Z"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
            客户等级
          </div>
          <div class="level-current">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#B8922E" stroke-width="2" v-if="customer.level === 'vip'"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            {{ getLevelText(customer.level) }}
          </div>
          <div class="level-desc">{{ getLevelDescription(customer.level) }}</div>
          <div class="level-rule">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            {{ getLevelRule(customer.level) }}
          </div>
          <div class="timeline-title">等级历史</div>
          <div class="level-timeline">
            <div class="timeline-item" v-for="(item, index) in levelHistory" :key="index">
              <div class="timeline-date">{{ formatDate(item.date) }}</div>
              <div class="timeline-text">{{ item.description }}</div>
            </div>
          </div>
        </div>

        <!-- Tag Management Card -->
        <div class="tag-card">
          <div class="card-title">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>
            标签管理
          </div>
          <div class="tag-section-label">当前标签</div>
          <div class="tag-list" id="activeTags">
            <span class="tag-item active" v-for="tag in (customer.tags || [])" :key="tag">
              {{ tag }}
              <svg class="tag-remove" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" @click="removeTag(tag)"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </span>
          </div>
          <div class="tag-section-label">可用标签（点击添加）</div>
          <div class="tag-list" id="availableTags">
            <span class="tag-item available" v-for="tag in availableTags" :key="tag" @click="addTag(tag)" v-if="!customer.tags?.includes(tag)">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              {{ tag }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Dialog -->
    <el-dialog v-model="showEditDialog" title="编辑客户信息" width="500px">
      <el-form :model="editForm" label-position="top">
        <el-form-item label="客户姓名">
          <el-input v-model="editForm.name" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="editForm.phone" />
        </el-form-item>
        <el-form-item label="区域">
          <el-input v-model="editForm.area" />
        </el-form-item>
        <el-form-item label="详细地址">
          <el-input v-model="editForm.address" />
        </el-form-item>
        <el-form-item label="备注/偏好">
          <el-input v-model="editForm.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" @click="saveCustomer" :loading="saveLoading">保存</el-button>
      </template>
    </el-dialog>

    <!-- Add Tag Dialog -->
    <el-dialog v-model="showTagDialog" title="添加标签" width="400px">
      <div class="preset-tags">
        <span v-for="tag in presetTags" :key="tag" class="tag" :class="{ active: newTag === tag }" @click="newTag = tag" style="cursor:pointer;">{{ tag }}</span>
      </div>
      <el-input v-model="newTag" placeholder="输入自定义标签" style="margin-top:12px;" @keyup.enter="addTag" />
      <template #footer>
        <el-button @click="showTagDialog = false">取消</el-button>
        <el-button type="primary" @click="addTag">添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/utils/api'
import { ElMessage } from 'element-plus'
import { formatDate, formatCurrency } from '@/utils/format'

const route = useRoute()
const customerId = route.params.id

const customer = ref({})
const orders = ref([])
const showEditDialog = ref(false)
const showLevelDialog = ref(false)
const saveLoading = ref(false)
const newTag = ref('')

const availableTags = ['价格敏感', '周末预约', '老人独居', '高价值客户', '某小区业主', '新客户', '回头客']

const levelHistory = ref([
  { date: '2025-08-15', description: '注册为普通客户' },
  { date: '2025-12-20', description: '升级为VIP客户（累计消费达标）' }
])

const editForm = ref({
  name: '',
  phone: '',
  area: '',
  address: '',
  remark: ''
})

function getLevelText(level) {
  const map = { normal: '普通客户', vip: 'VIP客户', blacklist: '黑名单' }
  return map[level] || '普通客户'
}

function getLevelDescription(level) {
  const map = {
    normal: '普通客户，享受标准服务',
    vip: '高价值客户，享受优先派单服务',
    blacklist: '黑名单客户，服务受限'
  }
  return map[level] || '普通客户，享受标准服务'
}

function getLevelRule(level) {
  const map = {
    normal: '默认等级，所有新注册客户',
    vip: '累计消费超过¥3,000自动升级',
    blacklist: '恶意欠费客户'
  }
  return map[level] || '默认等级，所有新注册客户'
}

function getStatusClass(status) {
  const map = {
    pending: 'pending-dispatch', dispatched: 'dispatched', working: 'in-progress',
    completed: 'completed', callback: 'followed-up', cancelled: 'cancelled', consultation: 'consultation'
  }
  return map[status] || ''
}

function getStatusText(status) {
  const map = {
    pending: '待派单', dispatched: '已派单', working: '施工中',
    completed: '已完成', callback: '已回访', cancelled: '已取消', consultation: '咨询单'
  }
  return map[status] || status
}

async function fetchCustomer() {
  try {
    const response = await api.get(`/customers/${customerId}`)
    customer.value = response.data
    editForm.value = {
      name: customer.value.name || '',
      phone: customer.value.phone || '',
      area: customer.value.area || '',
      address: customer.value.address || '',
      remark: customer.value.remark || ''
    }
  } catch (error) {
    ElMessage.error('获取客户信息失败')
  }
}

async function fetchOrders() {
  try {
    const response = await api.get('/orders', { params: { customerId, pageSize: 50 } })
    orders.value = response.data.items || response.data || []
  } catch (error) {
    console.error('获取工单历史失败')
  }
}

async function saveCustomer() {
  saveLoading.value = true
  try {
    await api.patch(`/customers/${customerId}`, editForm.value)
    ElMessage.success('保存成功')
    showEditDialog.value = false
    await fetchCustomer()
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    saveLoading.value = false
  }
}

async function changeLevel(level) {
  try {
    await api.patch(`/customers/${customerId}`, { level })
    ElMessage.success('等级已更新')
    showLevelDialog.value = false
    await fetchCustomer()
  } catch (error) {
    ElMessage.error('更新失败')
  }
}

async function addTag(tag) {
  const tags = [...(customer.value.tags || [])]
  if (!tags.includes(tag)) {
    tags.push(tag)
    try {
      await api.patch(`/customers/${customerId}`, { tags })
      ElMessage.success('标签已添加')
      await fetchCustomer()
    } catch (error) {
      ElMessage.error('添加失败')
    }
  }
}

async function removeTag(tag) {
  const tags = [...(customer.value.tags || [])]
  const index = tags.indexOf(tag)
  if (index > -1) {
    tags.splice(index, 1)
    try {
      await api.patch(`/customers/${customerId}`, { tags })
      ElMessage.success('标签已移除')
      await fetchCustomer()
    } catch (error) {
      ElMessage.error('移除失败')
    }
  }
}

onMounted(() => {
  fetchCustomer()
  fetchOrders()
})
</script>

<style scoped lang="scss">
.customer-detail-page {
  position: relative;
  z-index: 1;
}

/* ===== 1. Detail Header ===== */
.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
}
.detail-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}
.btn-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 36px;
  padding: 0 20px;
  border-radius: 999px;
  border: 1.5px solid var(--primary);
  background: transparent;
  color: var(--primary);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}
.btn-back:hover {
  background: rgba(74,127,181,0.08);
}
.btn-back svg { width: 16px; height: 16px; stroke-width: 2; }
.page-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 20px;
  color: var(--fg);
}
.detail-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.btn-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 36px;
  padding: 0 20px;
  border-radius: 999px;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  border: 1.5px solid transparent;
}
.btn-pill svg { width: 16px; height: 16px; stroke-width: 2; }
.btn-pill.primary {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
  box-shadow: var(--shadow-soft);
}
.btn-pill.primary:hover {
  background: #3D6FA0;
  border-color: #3D6FA0;
  box-shadow: var(--shadow-soft);
}
.btn-pill.secondary-outline {
  background: transparent;
  border-color: var(--secondary);
  color: var(--secondary);
}
.btn-pill.secondary-outline:hover {
  background: rgba(232,184,75,0.08);
}

/* ===== 2. Customer Overview Card ===== */
.overview-card {
  background: var(--card-bg);
  border: 1px solid rgba(222,216,207,0.5);
  border-radius: 24px 16px 24px 16px;
  box-shadow: var(--shadow-soft);
  padding: 32px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
  transition: all 0.3s ease;
}
.overview-card:hover {
  box-shadow: var(--shadow-hover);
}
.overview-left {
  display: flex;
  align-items: center;
  gap: 24px;
}
.customer-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 28px;
  font-weight: 700;
  font-family: var(--font-display);
  flex-shrink: 0;
  box-shadow: 0 4px 16px rgba(74,127,181,0.25);
}
.customer-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.customer-name {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 24px;
  color: var(--fg);
  line-height: 1.2;
}
.customer-phone {
  font-size: 14px;
  color: var(--muted-fg);
  font-weight: 500;
}
.customer-badges {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
}
.vip-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 14px;
  border-radius: 999px;
  background: rgba(232,184,75,0.15);
  color: #B8922E;
  font-size: 12px;
  font-weight: 700;
}
.vip-badge svg { width: 14px; height: 14px; }
.tag-pill {
  display: inline-flex;
  padding: 4px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: rgba(74,127,181,0.08);
  color: var(--primary);
}
.overview-right {
  display: flex;
  align-items: center;
  gap: 40px;
}
.stat-item {
  text-align: center;
}
.stat-value {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 28px;
  color: var(--fg);
  line-height: 1.1;
}
.stat-value .unit {
  font-size: 14px;
  font-weight: 500;
  color: var(--muted-fg);
  margin-left: 2px;
}
.stat-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--muted-fg);
  margin-top: 4px;
}
.stat-divider {
  width: 1px;
  height: 48px;
  background: var(--border);
}

/* ===== 3. Two Column Layout ===== */
.two-col-layout {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
}
@media (max-width: 1100px) {
  .two-col-layout { grid-template-columns: 1fr; }
}

/* ===== Card Base ===== */
.detail-card {
  background: var(--card-bg);
  border: 1px solid rgba(222,216,207,0.5);
  border-radius: 24px;
  box-shadow: var(--shadow-soft);
  padding: 24px 28px;
  margin-bottom: 24px;
  transition: all 0.3s ease;
}
.detail-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}
.detail-card:nth-child(1) { border-radius: 24px 16px 24px 16px; }
.detail-card:nth-child(2) { border-radius: 16px 24px 16px 24px; }
.card-title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 16px;
  color: var(--fg);
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.card-title svg { width: 20px; height: 20px; stroke: var(--primary); stroke-width: 2; fill: none; }

/* ===== Field List ===== */
.field-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.field-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 13px;
  line-height: 1.6;
}
.field-label {
  color: var(--muted-fg);
  font-weight: 600;
  min-width: 80px;
  flex-shrink: 0;
}
.field-value {
  color: var(--fg);
  font-weight: 500;
  word-break: break-all;
}
.field-value.note {
  background: rgba(232,184,75,0.08);
  padding: 10px 16px;
  border-radius: 12px;
  color: #6B5A2E;
  line-height: 1.7;
  font-size: 13px;
}

/* ===== Order History Table ===== */
.table-wrapper {
  background: var(--card-bg);
  border: 1px solid rgba(222,216,207,0.5);
  border-radius: 24px;
  box-shadow: var(--shadow-soft);
  overflow: hidden;
  transition: all 0.3s ease;
}
.table-wrapper:hover {
  box-shadow: var(--shadow-hover);
}
.table-wrapper .card-title {
  padding: 24px 28px 0;
}
.history-table {
  width: 100%;
  border-collapse: collapse;
}
.history-table thead th {
  padding: 12px 16px;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted-fg);
  text-align: left;
  border-bottom: 1px solid var(--border);
  background: transparent;
  white-space: nowrap;
}
.history-table thead th:first-child { padding-left: 28px; }
.history-table thead th:last-child { padding-right: 28px; }
.history-table tbody td {
  padding: 14px 16px;
  font-size: 13px;
  color: var(--fg);
  border-bottom: 1px solid rgba(222,216,207,0.25);
  white-space: nowrap;
}
.history-table tbody td:first-child { padding-left: 28px; }
.history-table tbody td:last-child { padding-right: 28px; }
.history-table tbody tr:last-child td { border-bottom: none; }
.history-table tbody tr {
  transition: background 0.3s ease;
}
.history-table tbody tr:hover { background: rgba(240,235,229,0.4); }
.order-id-link {
  font-weight: 600;
  color: var(--primary);
  cursor: pointer;
  transition: color 0.3s ease;
}
.order-id-link:hover { text-decoration: underline; color: #3D6A9A; }
.status-badge {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
.status-badge.followed-up { background: rgba(74,127,181,0.12); color: #4A7FB5; }
.status-badge.completed { background: rgba(74,127,181,0.15); color: #3D6A9A; }
.category-pill {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(74,127,181,0.1);
  color: var(--primary);
  font-size: 12px;
  font-weight: 600;
}
.cost-value {
  font-weight: 600;
  color: var(--fg);
}

/* ===== Right Column Cards ===== */
/* Level Card */
.level-card {
  background: var(--card-bg);
  border: 1px solid rgba(222,216,207,0.5);
  border-radius: 24px 16px 24px 16px;
  box-shadow: var(--shadow-soft);
  padding: 24px 28px;
  margin-bottom: 24px;
  transition: all 0.3s ease;
}
.level-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}
.level-current {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 22px;
  color: #B8922E;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.level-current svg { width: 22px; height: 22px; }
.level-desc {
  font-size: 13px;
  color: var(--muted-fg);
  font-weight: 500;
  margin-bottom: 16px;
  line-height: 1.6;
}
.level-rule {
  font-size: 12px;
  color: var(--accent-fg);
  font-weight: 500;
  background: rgba(230,220,205,0.4);
  padding: 10px 14px;
  border-radius: 12px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.level-rule svg { width: 16px; height: 16px; flex-shrink: 0; stroke: var(--accent-fg); }
.timeline-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--fg);
  margin-bottom: 14px;
}
.level-timeline {
  position: relative;
  padding-left: 20px;
}
.level-timeline::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: var(--border);
  border-radius: 2px;
}
.timeline-item {
  position: relative;
  padding-bottom: 18px;
  padding-left: 16px;
}
.timeline-item:last-child { padding-bottom: 0; }
.timeline-item::before {
  content: '';
  position: absolute;
  left: -18px;
  top: 6px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid var(--primary);
  background: var(--card-bg);
}
.timeline-item:last-child::before {
  border-color: var(--secondary);
  background: rgba(232,184,75,0.2);
}
.timeline-date {
  font-size: 12px;
  color: var(--muted-fg);
  font-weight: 500;
  margin-bottom: 2px;
}
.timeline-text {
  font-size: 13px;
  color: var(--fg);
  font-weight: 500;
  line-height: 1.5;
}

/* Tag Management Card */
.tag-card {
  background: var(--card-bg);
  border: 1px solid rgba(222,216,207,0.5);
  border-radius: 16px 24px 16px 24px;
  box-shadow: var(--shadow-soft);
  padding: 24px 28px;
  transition: all 0.3s ease;
}
.tag-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}
.tag-section-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted-fg);
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}
.tag-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  cursor: default;
  transition: all 0.3s ease;
}
.tag-item.active {
  background: rgba(74,127,181,0.12);
  color: var(--primary);
}
.tag-item.active .tag-remove {
  width: 14px;
  height: 14px;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s ease;
  margin-left: 2px;
}
.tag-item.active .tag-remove:hover { opacity: 1; }
.tag-item.available {
  background: var(--muted);
  color: var(--muted-fg);
  cursor: pointer;
  border: 1px dashed rgba(222,216,207,0.8);
}
.tag-item.available:hover {
  background: rgba(74,127,181,0.08);
  color: var(--primary);
  border-color: rgba(74,127,181,0.3);
}
.tag-item.available svg { width: 14px; height: 14px; }

@media (max-width: 900px) {
  .profile-layout { grid-template-columns: 1fr; }
}
</style>
