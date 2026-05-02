<template>
  <div class="callback-list-page">
    <!-- Page Header + Stats Pills -->
    <div class="page-header">
      <h2 class="page-title">回访管理</h2>
      <div class="stats-pills">
        <div class="stat-pill blue">
          <span class="pill-dot"></span>
          待回访
          <span class="pill-value">{{ pendingCount || 0 }}</span>
        </div>
        <div class="stat-pill green">
          <span class="pill-dot"></span>
          已回访
          <span class="pill-value">{{ completedCount || 0 }}</span>
        </div>
        <div class="stat-pill red">
          <span class="pill-dot"></span>
          超期未回访
          <span class="pill-value">{{ overdueCount || 0 }}</span>
        </div>
      </div>
    </div>

    <!-- Filter Toolbar -->
    <div class="filter-toolbar">
      <el-date-picker v-model="filters.startDate" class="filter-date" type="date" value-format="YYYY-MM-DD" placeholder="请选择日期" />
      <span style="color:var(--muted-fg);font-size:13px;white-space:nowrap">至</span>
      <el-date-picker v-model="filters.endDate" class="filter-date" type="date" value-format="YYYY-MM-DD" placeholder="请选择日期" />
      <el-select v-model="filters.area" class="filter-select-el" placeholder="全部区域" clearable>
        <el-option label="新城区" value="新城区" />
        <el-option label="未央区" value="未央区" />
        <el-option label="高新区" value="高新区" />
        <el-option label="灞桥区" value="灞桥区" />
      </el-select>
      <el-select v-model="filters.status" class="filter-select-el" placeholder="全部状态" clearable>
        <el-option label="待回访" value="pending" />
        <el-option label="已回访" value="done" />
        <el-option label="无需回访" value="skip" />
      </el-select>
      <input class="filter-input" type="text" v-model="searchQuery" placeholder="搜索订单号、客户姓名、联系方式..." @keyup.enter="fetchCallbacks" />
      <button class="btn-query" @click="fetchCallbacks">查询</button>
      <button class="btn-reset" @click="resetFilters">重置</button>
    </div>

    <!-- Data Table -->
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width:14%">订单号</th>
            <th style="width:9%">客户姓名</th>
            <th style="width:11%">联系方式</th>
            <th style="width:11%">问题分类</th>
            <th style="width:12%">完成时间</th>
            <th style="width:9%">等待天数</th>
            <th style="width:9%">状态</th>
            <th style="width:25%">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in callbacks" :key="item.id" :class="{ overdue: isOverdue(item) }">
            <td><span class="order-id">{{ item.orderNo }}</span></td>
            <td>{{ item.customerName }}</td>
            <td>{{ item.customerPhone }}</td>
            <td>{{ item.category || '-' }}</td>
            <td>{{ formatDate(item.completedAt) }}</td>
            <td>{{ getDayBadge(item.waitDays || 0) }}</td>
            <td><span class="status-badge" :class="getStatusClass(item.status)">{{ getStatusText(item.status) }}</span></td>
            <td>
              <template v-if="item.status === 'pending'">
                <button class="action-btn primary-pill" @click="showCallbackDialog(item)">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  执行回访
                </button>
                <button class="action-btn gray" @click="skipCallback(item)">无需回访</button>
              </template>
              <template v-else-if="item.status === 'done'">
                <button class="action-btn" @click="viewCallback(item)">查看</button>
              </template>
              <template v-else>
                <button class="action-btn gray" @click="viewCallback(item)">查看</button>
              </template>
            </td>
          </tr>
          <tr v-if="!loading && callbacks.length === 0">
            <td colspan="8" class="empty-cell">
              <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--muted-fg)" stroke-width="1.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                <p>暂无回访数据</p>
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
        <el-select v-model="pagination.pageSize" class="page-size-select" @change="fetchCallbacks">
          <el-option :value="10" label="10" />
          <el-option :value="20" label="20" />
          <el-option :value="50" label="50" />
        </el-select>
        条
      </div>
      <div class="pagination-buttons">
        <button class="page-btn nav-arrow" :disabled="pagination.page <= 1" @click="pagination.page--; fetchCallbacks()">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <button v-for="p in displayPages" :key="p" class="page-btn" :class="{ active: pagination.page === p }" @click="pagination.page = p; fetchCallbacks()">{{ p }}</button>
        <button v-if="totalPages > 5 && pagination.page < totalPages - 2" class="page-btn">...</button>
        <button v-if="totalPages > 5 && pagination.page < totalPages - 2" class="page-btn" @click="pagination.page = totalPages; fetchCallbacks()">{{ totalPages }}</button>
        <button class="page-btn nav-arrow" :disabled="pagination.page >= totalPages" @click="pagination.page++; fetchCallbacks()">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>

    <!-- Callback Dialog -->
    <el-dialog v-model="dialogVisible" title="执行回访" width="560px" :close-on-click-modal="false">
      <el-form :model="callbackForm" label-position="top">
        <el-form-item label="是否满意">
          <el-radio-group v-model="callbackForm.isSatisfied">
            <el-radio :value="true">满意</el-radio>
            <el-radio :value="false">不满意</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="满意度评分">
          <div class="rate-input">
            <span v-for="i in 5" :key="i" class="rate-star" :class="{ active: i <= callbackForm.satisfactionScore }" @click="callbackForm.satisfactionScore = i">★</span>
          </div>
        </el-form-item>
        <el-form-item label="费用是否一致">
          <el-radio-group v-model="callbackForm.feeConsistent">
            <el-radio :value="true">一致</el-radio>
            <el-radio :value="false">不一致</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="回访方式">
          <el-select v-model="callbackForm.callbackMethod" style="width:100%">
            <el-option label="电话" value="phone" />
            <el-option label="微信" value="wechat" />
            <el-option label="上门" value="visit" />
          </el-select>
        </el-form-item>
        <el-form-item label="其他评价">
          <el-input v-model="callbackForm.otherFeedback" type="textarea" :rows="3" placeholder="记录客户其他反馈" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitCallback" :loading="submitLoading">提交回访</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/utils/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { formatDate } from '@/utils/format'

const router = useRouter()
const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const callbacks = ref([])
const searchQuery = ref('')
const pendingCount = ref(0)
const completedCount = ref(0)
const overdueCount = ref(0)
const currentCallback = ref(null)
const pagination = ref({ page: 1, pageSize: 20, total: 0 })

const filters = ref({
  startDate: '',
  endDate: '',
  area: '',
  status: ''
})

const callbackForm = ref({
  isSatisfied: true,
  satisfactionScore: 5,
  feeConsistent: true,
  callbackMethod: 'phone',
  otherFeedback: ''
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
  return item.status === 'pending' && (item.waitDays || 0) > 3
}

function getDayBadge(days) {
  if (days > 3) return `<span class="day-badge danger">${days}天</span>`
  if (days === 3) return `<span class="day-badge warn">${days}天</span>`
  return `<span class="day-badge normal">${days}天</span>`
}

function getStatusClass(status) {
  const map = { pending: 'pending', done: 'done', skip: 'skip' }
  return map[status] || ''
}

function getStatusText(status) {
  const map = { pending: '待回访', done: '已回访', skip: '无需回访' }
  return map[status] || status
}

function viewCallback(item) {
  console.log('查看回访详情:', item)
}

function showCallbackDialog(item) {
  currentCallback.value = item
  callbackForm.value = { isSatisfied: true, satisfactionScore: 5, feeConsistent: true, callbackMethod: 'phone', otherFeedback: '' }
  dialogVisible.value = true
}

async function skipCallback(item) {
  try {
    const { value } = await ElMessageBox.prompt('请填写无需回访的原因', '标记无需回访', {
      confirmButtonText: '确定', cancelButtonText: '取消', inputPattern: /.+/, inputErrorMessage: '请填写原因'
    })
    await api.patch(`/callbacks/${item.id}`, { status: 'skip', skipReason: value })
    ElMessage.success('已标记为无需回访')
    await fetchCallbacks()
  } catch (e) {}
}

async function submitCallback() {
  submitLoading.value = true
  try {
    await api.post(`/callbacks/${currentCallback.value.id}/complete`, callbackForm.value)
    ElMessage.success('回访提交成功')
    dialogVisible.value = false
    await fetchCallbacks()
  } catch (error) {
    ElMessage.error('提交失败')
  } finally {
    submitLoading.value = false
  }
}

function resetFilters() {
  searchQuery.value = ''
  filters.value = {
    startDate: '',
    endDate: '',
    area: '',
    status: ''
  }
  pagination.value.page = 1
  fetchCallbacks()
}

async function fetchCallbacks() {
  loading.value = true
  try {
    const params = {
      page: pagination.value.page,
      pageSize: pagination.value.pageSize
    }
    if (searchQuery.value) params.keyword = searchQuery.value
    if (filters.value.status) params.status = filters.value.status
    if (filters.value.startDate) params.startDate = filters.value.startDate
    if (filters.value.endDate) params.endDate = filters.value.endDate
    if (filters.value.area) params.area = filters.value.area

    const response = await api.get('/callbacks', { params })
    callbacks.value = response.data.items || response.data || []
    pagination.value.total = response.data.total || callbacks.value.length

    // 计算统计数据
    pendingCount.value = callbacks.value.filter(item => item.status === 'pending').length
    completedCount.value = callbacks.value.filter(item => item.status === 'done').length
    overdueCount.value = callbacks.value.filter(item => isOverdue(item)).length
  } catch (error) {
    ElMessage.error('获取回访列表失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => { fetchCallbacks() })
</script>

<style scoped lang="scss">
.callback-list-page { position: relative; z-index: 1; }

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
  gap: 10px;
}
.stat-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 18px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s ease;
  cursor: default;
}
.stat-pill .pill-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.stat-pill .pill-value {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 16px;
}
.stat-pill.blue {
  background: rgba(74,127,181,0.1);
  color: var(--primary);
}
.stat-pill.blue .pill-dot { background: var(--primary); }
.stat-pill.green {
  background: rgba(74,158,100,0.1);
  color: #4A9E64;
}
.stat-pill.green .pill-dot { background: #4A9E64; }
.stat-pill.red {
  background: rgba(212,114,106,0.1);
  color: var(--destructive);
}
.stat-pill.red .pill-dot { background: var(--destructive); }

/* Status badges */
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
.status-badge.pending { background: rgba(74,127,181,0.12); color: #4A7FB5; }
.status-badge.done { background: rgba(74,158,100,0.12); color: #4A9E64; }
.status-badge.skip { background: rgba(120,120,108,0.1); color: #78786C; }

/* Overdue day badge */
.day-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
.day-badge.normal { background: rgba(74,127,181,0.08); color: var(--muted-fg); }
.day-badge.warn { background: rgba(232,184,75,0.12); color: #B8922E; }
.day-badge.danger { background: rgba(212,114,106,0.1); color: var(--destructive); }

/* ===== Filter Toolbar ===== */
.filter-toolbar {
  background: rgba(240,235,229,0.5);
  border-radius: 24px;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.filter-input {
  flex: 1;
  height: 40px;
  border-radius: 999px;
  border: 1px solid rgba(222,216,207,0.8);
  background: rgba(255,255,255,0.5);
  padding: 0 16px;
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--fg);
  outline: none;
  transition: all 0.2s ease;
}
.filter-input::placeholder { color: var(--muted-fg); opacity: 0.7; }
.filter-input:focus {
  box-shadow: 0 0 0 3px rgba(74,127,181,0.15);
  border-color: var(--primary);
  background: rgba(255,255,255,0.8);
}
.filter-input[type="date"] {
  width: 160px;
  cursor: pointer;
  padding-right: 16px;
}
.filter-input[type="date"]::-webkit-calendar-picker-indicator {
  cursor: pointer;
  opacity: 0.5;
  width: 14px;
  height: 14px;
}
.filter-input[type="date"]::-webkit-calendar-picker-indicator:hover {
  opacity: 0.8;
}
.filter-select {
  height: 40px;
  border-radius: 999px;
  border: 1px solid rgba(222,216,207,0.8);
  background: rgba(255,255,255,0.5);
  padding: 0 16px;
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--fg);
  outline: none;
  cursor: pointer;
  transition: all 0.2s ease;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%2378786C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  padding-right: 36px;
}
.filter-select:focus {
  box-shadow: 0 0 0 3px rgba(74,127,181,0.15);
  border-color: var(--primary);
}

.filter-select-el {
  width: 200px !important;
  :deep(.el-input__wrapper) {
    border-radius: 999px !important;
    height: 40px !important;
    padding: 0 44px 0 16px !important;
    background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%2378786C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") !important;
    background-repeat: no-repeat !important;
    background-position: right 16px center !important;
    background-color: rgba(255,255,255,0.5) !important;
    box-shadow: 0 0 0 1px rgba(222,216,207,0.8) !important;
  }
}
.btn-query {
  height: 36px;
  padding: 0 20px;
  border-radius: 999px;
  border: 1.5px solid var(--primary);
  background: var(--primary);
  color: white;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--shadow-soft);
  transition: all 0.2s ease;
  white-space: nowrap;
}
.btn-query:hover {
  background: #3D6FA0;
  border-color: #3D6FA0;
  box-shadow: var(--shadow-soft);
}
.btn-reset {
  height: 36px;
  padding: 0 20px;
  border-radius: 999px;
  border: 1.5px solid var(--secondary);
  background: transparent;
  color: var(--secondary);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}
.btn-reset:hover {
  background: rgba(232,184,75,0.08);
}

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
  height: 48px;
  transition: background 0.3s ease;
}
.data-table tbody tr:hover { background: rgba(240,235,229,0.4); }
.data-table tbody tr.overdue { background: rgba(212,114,106,0.06); }
.data-table tbody tr.overdue:hover { background: rgba(212,114,106,0.1); }
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
.order-id {
  font-weight: 600;
  color: var(--primary);
  cursor: pointer;
}
.order-id:hover { text-decoration: underline; }

/* ===== Pagination ===== */
/* ===== Action buttons ===== */
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
  transition: all 0.2s ease;
}
.action-btn:hover { background: rgba(74,127,181,0.08); color: #3D6A9A; }
.action-btn + .action-btn { margin-left: 4px; }
.action-btn.gray { color: var(--muted-fg); }
.action-btn.gray:hover { background: rgba(120,120,108,0.08); color: var(--fg); }
.action-btn.primary-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 28px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(74,127,181,0.12);
  color: var(--primary);
  font-weight: 600;
  font-size: 12px;
}
.action-btn.primary-pill:hover {
  background: var(--primary);
  color: white;
  box-shadow: var(--shadow-soft);
}
.action-btn.primary-pill svg {
  width: 14px;
  height: 14px;
  stroke-width: 2;
}

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

.empty-cell { text-align: center !important; padding: 48px 24px !important; }
.empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; color: var(--muted-fg); font-size: 14px; }
</style>

<style>
/* ===== 评分样式 ===== */
.rate-input {
  display: flex;
  gap: 6px;
  align-items: center;
}
.rate-star {
  font-size: 24px;
  color: var(--border);
  cursor: pointer;
  transition: all 0.2s ease;
}
.rate-star.active {
  color: var(--secondary);
}

/* ===== Element Plus 组件覆盖样式 ===== */
/* Dialog */
.el-dialog {
  border-radius: 24px !important;
  background: var(--card-bg) !important;
}
.el-dialog__title {
  font-family: var(--font-display) !important;
  font-weight: 700 !important;
  font-size: 18px !important;
}
.el-form-item__label {
  font-family: var(--font-body) !important;
  font-weight: 600 !important;
  font-size: 14px !important;
}

/* Radio Group */
.el-radio-group {
  display: flex;
  gap: 24px !important;
}
.el-radio {
  font-size: 14px !important;
  font-weight: 500 !important;
  font-family: var(--font-body) !important;
}
.el-radio__inner {
  width: 18px !important;
  height: 18px !important;
  border-radius: 50% !important;
  border: 2px solid var(--border) !important;
}
.el-radio__inner:hover {
  border-color: var(--primary) !important;
}
.el-radio__input.is-checked .el-radio__inner {
  background: var(--primary) !important;
  border-color: var(--primary) !important;
}

/* Select */
.el-select .el-input__wrapper {
  border-radius: 999px !important;
  height: 40px !important;
  padding: 0 44px 0 16px !important;
  background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%2378786C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") !important;
  background-repeat: no-repeat !important;
  background-position: right 16px center !important;
  background-color: rgba(255,255,255,0.5) !important;
  border: 1px solid rgba(222,216,207,0.8) !important;
}

.el-select-dropdown__item {
  height: 36px !important;
  line-height: 36px !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  font-family: var(--font-body) !important;
}
.el-select-dropdown__item:hover {
  background: rgba(74,127,181,0.08) !important;
}
.el-select-dropdown__item.is-selected {
  color: var(--primary) !important;
  font-weight: 600 !important;
  background: rgba(74,127,181,0.06) !important;
}

/* Input */
.el-input__wrapper {
  border-radius: 999px !important;
  height: 40px !important;
  background-color: rgba(255,255,255,0.5) !important;
  border: 1px solid rgba(222,216,207,0.8) !important;
}
.el-input__wrapper:focus-within {
  border-color: var(--primary) !important;
  box-shadow: 0 0 0 3px rgba(74,127,181,0.15) !important;
}

/* Textarea */
.el-textarea__inner {
  border-radius: 16px !important;
  background: rgba(255,255,255,0.5) !important;
  border: 1px solid rgba(222,216,207,0.8) !important;
  font-family: var(--font-body) !important;
  font-size: 14px !important;
  line-height: 1.6 !important;
}
.el-textarea__inner:focus {
  border-color: var(--primary) !important;
  box-shadow: 0 0 0 3px rgba(74,127,181,0.15) !important;
}

/* Button */
.el-button {
  height: 36px !important;
  padding: 0 20px !important;
  border-radius: 999px !important;
  font-family: var(--font-body) !important;
  font-size: 14px !important;
  font-weight: 600 !important;
  border: 1.5px solid transparent !important;
}
.el-button--primary {
  background: var(--primary) !important;
  border-color: var(--primary) !important;
  color: white !important;
}
.el-button--primary:hover {
  background: #3D6FA0 !important;
  border-color: #3D6FA0 !important;
  box-shadow: var(--shadow-soft) !important;
}
.el-button--default {
  background: transparent !important;
  border-color: var(--border) !important;
  color: var(--muted-fg) !important;
}
.el-button--default:hover {
  background: rgba(230,220,205,0.4) !important;
  border-color: var(--border) !important;
  color: var(--fg) !important;
}
.el-button--danger {
  background: transparent !important;
  border-color: var(--destructive) !important;
  color: var(--destructive) !important;
}
.el-button--danger:hover {
  background: rgba(212,114,106,0.08) !important;
  border-color: var(--destructive) !important;
}
</style>
