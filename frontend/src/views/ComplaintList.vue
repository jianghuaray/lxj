<template>
  <div class="complaint-list-page">
    <!-- Page Header -->
    <div class="page-header">
      <h2 class="page-title">投诉管理</h2>
      <div class="stats-pills">
        <div class="stat-pill red">
          <span class="pill-dot"></span>
          待处理 <span class="pill-count">{{ pendingCount || 0 }}</span>
        </div>
        <div class="stat-pill yellow">
          <span class="pill-dot"></span>
          处理中 <span class="pill-count">{{ processingCount || 0 }}</span>
        </div>
        <div class="stat-pill green">
          <span class="pill-dot"></span>
          已解决 <span class="pill-count">{{ resolvedCount || 0 }}</span>
        </div>
      </div>
    </div>

    <!-- Filter Toolbar -->
    <div class="filter-toolbar">
      <input class="filter-input" type="date" v-model="filters.startDate">
      <span style="color:var(--muted-fg);font-size:13px;">至</span>
      <input class="filter-input" type="date" v-model="filters.endDate">
      <select class="filter-select" v-model="filters.status">
        <option value="">投诉状态</option>
        <option value="pending">待处理</option>
        <option value="processing">处理中</option>
        <option value="resolved">已解决</option>
        <option value="closed">已关闭</option>
      </select>
      <select class="filter-select" v-model="filters.source">
        <option value="">投诉来源</option>
        <option value="direct">客户主动</option>
        <option value="callback">回访转入</option>
      </select>
      <input class="filter-input filter-search" type="text" v-model="searchQuery" placeholder="搜索编号、订单号、客户姓名..." @keyup.enter="fetchComplaints">
      <button class="btn-query" @click="fetchComplaints">查询</button>
      <button class="btn-reset" @click="resetFilters">重置</button>
    </div>

    <!-- Data Table -->
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width:9%">编号</th>
            <th style="width:13%">关联订单号</th>
            <th style="width:8%">客户姓名</th>
            <th style="width:18%">投诉内容</th>
            <th style="width:9%">来源</th>
            <th style="width:9%">处理状态</th>
            <th style="width:12%">投诉时间</th>
            <th style="width:10%">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in complaints" :key="item.id" :class="{ overdue: isOverdue(item) }">
            <td><span class="complaint-id">{{ item.complaintNo || '-' }}</span></td>
            <td><span class="order-link" @click="viewOrder(item.orderId)">{{ item.orderNo || '-' }}</span></td>
            <td>{{ item.customerName || '-' }}</td>
            <td :title="item.content" class="content-cell">{{ item.content }}</td>
            <td>
              <span class="source-badge" :class="item.source === 'direct' ? 'customer' : 'followup'">
                {{ item.source === 'direct' ? '客户主动' : '回访转入' }}
              </span>
            </td>
            <td>
              <span class="status-badge" :class="item.status">{{ getStatusText(item.status) }}</span>
            </td>
            <td>
              <template v-if="isOverdue(item)">
                <span class="overdue-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </span>
              </template>
              {{ formatDate(item.createdAt) }}
            </td>
            <td>
              <template v-if="item.status === 'pending'">
                <button class="action-btn-pill" @click="handleProcess(item)">处理</button>
              </template>
              <template v-else-if="item.status === 'processing'">
                <button class="action-btn" @click="handleProcess(item)">编辑</button>
              </template>
              <template v-else>
                <button class="action-btn muted-action" @click="handleProcess(item)">查看</button>
              </template>
            </td>
          </tr>
          <tr v-if="!loading && complaints.length === 0">
            <td colspan="8" class="empty-cell">
              <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--muted-fg)" stroke-width="1.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <p>暂无投诉记录</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="pagination-bar">
      <div class="pagination-info">
        共 <strong>{{ pagination.total || 0 }}</strong> 条记录，每页
        <select v-model="pagination.pageSize" @change="fetchComplaints">
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
        </select>
        条
      </div>
      <div class="pagination-buttons">
        <button class="page-btn nav-arrow" :disabled="pagination.page <= 1" @click="pagination.page--; fetchComplaints()">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <button v-for="p in displayPages" :key="p" class="page-btn" :class="{ active: pagination.page === p }" @click="pagination.page = p; fetchComplaints()">
          {{ p }}
        </button>
        <button v-if="totalPages > 5 && pagination.page < totalPages - 2" class="page-btn">...</button>
        <button v-if="totalPages > 5 && pagination.page < totalPages - 2" class="page-btn" @click="pagination.page = totalPages; fetchComplaints()">
          {{ totalPages }}
        </button>
        <button class="page-btn nav-arrow" :disabled="pagination.page >= totalPages" @click="pagination.page++; fetchComplaints()">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Process Dialog -->
    <el-dialog v-model="processDialogVisible" :title="processingComplaint ? '处理投诉' : '新增投诉'" width="600px">
      <el-form :model="processForm" label-position="top">
        <template v-if="!processingComplaint">
          <el-form-item label="关联工单">
            <el-select v-model="processForm.orderId" placeholder="选择工单" filterable style="width:100%">
              <el-option v-for="order in orders" :key="order.id" :label="`${order.orderNo} - ${order.customerName}`" :value="order.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="投诉来源">
            <el-select v-model="processForm.source" style="width:100%">
              <el-option label="客户主动投诉" value="direct" />
              <el-option label="回访转投诉" value="callback" />
            </el-select>
          </el-form-item>
        </template>
        <el-form-item label="投诉内容">
          <el-input v-model="processForm.content" type="textarea" :rows="4" placeholder="描述投诉内容" />
        </el-form-item>
        <template v-if="processingComplaint">
          <el-form-item label="处理状态">
            <el-select v-model="processForm.status" style="width:100%">
              <el-option label="处理中" value="processing" />
              <el-option label="已解决" value="resolved" />
              <el-option label="已关闭" value="closed" />
            </el-select>
          </el-form-item>
          <el-form-item label="处理结果">
            <el-input v-model="processForm.result" type="textarea" :rows="3" placeholder="记录处理结果" />
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="processDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitProcess" :loading="submitLoading">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/utils/api'
import { ElMessage } from 'element-plus'
import { formatDate } from '@/utils/format'

const router = useRouter()
const loading = ref(false)
const submitLoading = ref(false)
const processDialogVisible = ref(false)
const processingComplaint = ref(null)
const complaints = ref([])
const orders = ref([])
const searchQuery = ref('')
const pendingCount = ref(0)
const processingCount = ref(0)
const resolvedCount = ref(0)
const closedCount = ref(0)
const pagination = ref({ page: 1, pageSize: 20, total: 0 })

const filters = ref({
  startDate: '',
  endDate: '',
  status: '',
  source: ''
})

const processForm = ref({
  orderId: null,
  source: 'direct',
  content: '',
  status: 'processing',
  result: ''
})

const totalPages = computed(() => Math.ceil(pagination.value.total / pagination.value.pageSize) || 1)
const displayPages = computed(() => {
  const total = totalPages.value
  const current = pagination.value.page
  const pages = []
  let start = Math.max(1, current - 2)
  let end = Math.min(total, start + 4)
  start = Math.max(1, end - 4)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

function isOverdue(item) {
  return ['pending', 'processing'].includes(item.status) && (item.waitDays || 0) > 7
}

function getStatusText(status) {
  const map = { pending: '待处理', processing: '处理中', resolved: '已解决', closed: '已关闭' }
  return map[status] || status
}

function viewOrder(orderId) {
  if (orderId) router.push(`/orders/${orderId}`)
}

function showDialog() {
  processingComplaint.value = null
  processForm.value = { orderId: null, source: 'direct', content: '', status: 'processing', result: '' }
  processDialogVisible.value = true
  fetchOrders()
}

function handleProcess(item) {
  processingComplaint.value = item
  processForm.value = { ...item, status: item.status === 'pending' ? 'processing' : item.status }
  processDialogVisible.value = true
}

async function submitProcess() {
  submitLoading.value = true
  try {
    if (processingComplaint.value) {
      await api.patch(`/complaints/${processingComplaint.value.id}`, processForm.value)
      ElMessage.success('处理成功')
    } else {
      await api.post('/complaints', processForm.value)
      ElMessage.success('投诉已创建')
    }
    processDialogVisible.value = false
    await fetchComplaints()
  } catch (error) {
    ElMessage.error('操作失败')
  } finally {
    submitLoading.value = false
  }
}

function resetFilters() {
  searchQuery.value = ''
  filters.value = {
    startDate: '',
    endDate: '',
    status: '',
    source: ''
  }
  pagination.value.page = 1
  fetchComplaints()
}

async function fetchComplaints() {
  loading.value = true
  try {
    const params = {
      page: pagination.value.page,
      pageSize: pagination.value.pageSize
    }
    if (searchQuery.value) params.keyword = searchQuery.value
    if (filters.value.status) params.status = filters.value.status
    if (filters.value.source) params.source = filters.value.source
    if (filters.value.startDate) params.startDate = filters.value.startDate
    if (filters.value.endDate) params.endDate = filters.value.endDate

    const response = await api.get('/complaints', { params })
    complaints.value = response.data.items || response.data || []
    pagination.value.total = response.data.total || complaints.value.length

    // 计算统计数据
    pendingCount.value = complaints.value.filter(item => item.status === 'pending').length
    processingCount.value = complaints.value.filter(item => item.status === 'processing').length
    resolvedCount.value = complaints.value.filter(item => item.status === 'resolved').length
    closedCount.value = complaints.value.filter(item => item.status === 'closed').length
  } catch (error) {
    ElMessage.error('获取投诉列表失败')
  } finally {
    loading.value = false
  }
}

async function fetchOrders() {
  try {
    const response = await api.get('/orders', { params: { pageSize: 100 } })
    orders.value = response.data.items || response.data || []
  } catch (error) {
    console.error('获取工单列表失败')
  }
}

onMounted(() => { fetchComplaints() })
</script>

<style scoped lang="scss">
.complaint-list-page { position: relative; z-index: 1; }

/* ===== Page Header ===== */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.page-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 24px;
  color: var(--fg);
}

/* ===== Stats Pills ===== */
.stats-pills {
  display: flex;
  align-items: center;
  gap: 12px;
}
.stat-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  font-family: var(--font-body);
  border: 1px solid transparent;
  transition: all 0.3s ease;
  cursor: default;
}
.stat-pill.red {
  background: rgba(212,114,106,0.1);
  color: #C45A52;
  border-color: rgba(212,114,106,0.2);
}
.stat-pill.yellow {
  background: rgba(232,184,75,0.1);
  color: #B8922E;
  border-color: rgba(232,184,75,0.2);
}
.stat-pill.green {
  background: rgba(74,160,100,0.1);
  color: #3D8A56;
  border-color: rgba(74,160,100,0.2);
}
.stat-pill .pill-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.stat-pill.red .pill-dot { background: #D4726A; }
.stat-pill.yellow .pill-dot { background: #E8B84B; }
.stat-pill.green .pill-dot { background: #4AA064; }
.stat-pill .pill-count {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 16px;
}

/* ===== Filter Toolbar ===== */
.filter-toolbar {
  background: rgba(240,235,229,0.5);
  border-radius: 24px;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.filter-input {
  height: 44px;
  border-radius: 999px;
  border: 1px solid rgba(222,216,207,0.8);
  background: rgba(255,255,255,0.5);
  padding: 0 18px;
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--fg);
  outline: none;
  transition: all 0.3s ease;
}
.filter-input::placeholder { color: var(--muted-fg); opacity: 0.7; }
.filter-input:focus {
  box-shadow: 0 0 0 2px rgba(74,127,181,0.2);
  border-color: rgba(74,127,181,0.3);
  background: rgba(255,255,255,0.8);
}
.filter-input[type="date"] {
  width: 155px;
  cursor: pointer;
}
.filter-input[type="date"]::-webkit-calendar-picker-indicator {
  cursor: pointer;
  opacity: 0.5;
}
.filter-select {
  height: 44px;
  border-radius: 999px;
  border: 1px solid rgba(222,216,207,0.8);
  background: rgba(255,255,255,0.5);
  padding: 0 16px;
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--fg);
  outline: none;
  cursor: pointer;
  transition: all 0.3s ease;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%2378786C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  padding-right: 36px;
}
.filter-select:focus {
  box-shadow: 0 0 0 2px rgba(74,127,181,0.2);
  border-color: rgba(74,127,181,0.3);
}
.filter-search {
  flex: 1;
  min-width: 160px;
}
.btn-query {
  height: 44px;
  padding: 0 24px;
  border-radius: 999px;
  border: none;
  background: var(--primary);
  color: white;
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--shadow-soft);
  transition: all 0.3s ease;
  white-space: nowrap;
}
.btn-query:hover {
  transform: scale(1.05);
  box-shadow: var(--shadow-hover);
}
.btn-query:active { transform: scale(0.95); }
.btn-reset {
  height: 44px;
  padding: 0 20px;
  border-radius: 999px;
  border: 2px solid var(--secondary);
  background: transparent;
  color: var(--secondary);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}
.btn-reset:hover {
  background: rgba(232,184,75,0.08);
  transform: scale(1.05);
}
.btn-reset:active { transform: scale(0.95); }

/* ===== Data Table ===== */
.table-container {
  background: var(--card-bg);
  border: 1px solid rgba(222,216,207,0.5);
  border-radius: 24px;
  box-shadow: var(--shadow-soft);
  overflow: hidden;
  margin-bottom: 16px;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.data-table thead th {
  padding: 14px 16px;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted-fg);
  text-align: left;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
  background: transparent;
}
.data-table thead th:first-child { padding-left: 24px; }
.data-table thead th:last-child { padding-right: 24px; text-align: center; }
.data-table tbody tr {
  height: 52px;
  transition: background 0.3s ease;
}
.data-table tbody tr:hover { background: rgba(240,235,229,0.4); }
.data-table tbody tr.overdue {
  background: rgba(212,114,106,0.06);
}
.data-table tbody tr.overdue:hover {
  background: rgba(212,114,106,0.1);
}
.data-table tbody td {
  padding: 0 16px;
  font-size: 13px;
  color: var(--fg);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.data-table tbody td:first-child { padding-left: 24px; }
.data-table tbody td:last-child { padding-right: 24px; text-align: center; }
.complaint-id {
  font-weight: 600;
  color: var(--primary);
  cursor: pointer;
}
.complaint-id:hover { text-decoration: underline; }
.order-link {
  font-weight: 500;
  color: var(--muted-fg);
  cursor: pointer;
}
.order-link:hover { color: var(--primary); }

/* ===== Status & Source Badges ===== */
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
.status-badge.pending {
  background: rgba(212,114,106,0.12);
  color: #C45A52;
}
.status-badge.processing {
  background: rgba(232,184,75,0.15);
  color: #B8922E;
}
.status-badge.resolved {
  background: rgba(74,160,100,0.12);
  color: #3D8A56;
}
.status-badge.closed {
  background: rgba(120,120,108,0.1);
  color: #78786C;
}
.source-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
.source-badge.customer {
  background: rgba(232,150,75,0.12);
  color: #C48A3E;
}
.source-badge.followup {
  background: rgba(74,127,181,0.12);
  color: #4A7FB5;
}

/* ===== Action Buttons ===== */
.action-btn {
  background: none;
  border: none;
  color: var(--primary);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: all 0.3s ease;
}
.action-btn:hover { background: rgba(74,127,181,0.08); color: #3D6A9A; }
.action-btn.muted-action {
  color: var(--muted-fg);
}
.action-btn.muted-action:hover {
  background: rgba(120,120,108,0.08);
  color: var(--fg);
}
.action-btn-pill {
  display: inline-flex;
  align-items: center;
  padding: 5px 16px;
  border-radius: 999px;
  border: none;
  background: var(--primary);
  color: white;
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: var(--shadow-soft);
}
.action-btn-pill:hover {
  transform: scale(1.05);
  box-shadow: var(--shadow-hover);
}
.action-btn-pill:active { transform: scale(0.95); }

/* ===== Pagination ===== */
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
}
.pagination-info {
  font-size: 13px;
  color: var(--muted-fg);
}
.pagination-info select {
  border: none;
  background: transparent;
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--muted-fg);
  cursor: pointer;
  outline: none;
}
.pagination-buttons {
  display: flex;
  align-items: center;
  gap: 6px;
}
.page-btn {
  min-width: 36px;
  height: 36px;
  border-radius: 999px;
  border: none;
  background: transparent;
  color: var(--muted-fg);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}
.page-btn:hover { background: rgba(230,220,205,0.4); }
.page-btn.active {
  background: var(--primary);
  color: white;
  box-shadow: var(--shadow-soft);
}
.page-btn.nav-arrow { padding: 0 10px; }
.page-btn svg { width: 16px; height: 16px; stroke-width: 2; }

/* ===== Overdue warning icon ===== */
.overdue-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin-right: 4px;
  vertical-align: middle;
  color: var(--destructive);
}
.overdue-icon svg { width: 14px; height: 14px; }

.content-cell { max-width: 240px; overflow: hidden; text-overflow: ellipsis; }
.empty-cell { text-align: center !important; padding: 48px 24px !important; }
.empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; color: var(--muted-fg); font-size: 14px; }
</style>
