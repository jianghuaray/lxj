<template>
  <div class="order-list-page">
    <!-- Page Header -->
    <div class="page-header">
      <h1 class="page-title">工单列表</h1>
      <button class="btn-new-order" @click="goToCreate">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M5 12h14"/><path d="M12 5v14"/>
        </svg>
        新建工单
      </button>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card" @click="activeTab = ''; specialFilter = ''; pagination.page = 1; fetchOrders()">
        <div class="stat-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>
          </svg>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">全部工单</div>
        </div>
      </div>
      <div class="stat-card" @click="activeTab = ''; specialFilter = 'pendingDispatch'; pagination.page = 1; fetchOrders()">
        <div class="stat-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ (stats.statusCounts.pending || 0) + (stats.statusCounts.dispatched || 0) }}</div>
          <div class="stat-label">待处理</div>
        </div>
      </div>
      <div class="stat-card" @click="activeTab = ''; specialFilter = 'overdue'; pagination.page = 1; fetchOrders()">
        <div class="stat-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.overdueCount }}</div>
          <div class="stat-label">超期工单</div>
        </div>
      </div>
      <div class="stat-card" @click="activeTab = ''; specialFilter = 'awaitCallback'; pagination.page = 1; fetchOrders()">
        <div class="stat-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.awaitCallbackCount }}</div>
          <div class="stat-label">待回访</div>
        </div>
      </div>
    </div>

    <!-- Status Tabs -->
    <div class="status-tabs">
    <button
      v-for="tab in statusTabs"
      :key="tab.value"
      class="status-tab"
      :class="{ active: activeTab === tab.value }"
      @click="activeTab = tab.value; specialFilter = ''; fetchOrders()"
    >
        {{ tab.label }}
        <span class="tab-count">{{ tab.count }}</span>
      </button>
    </div>

    <!-- Filter Toolbar -->
    <div class="filter-toolbar">
      <input
        class="filter-input"
        v-model="searchQuery"
        placeholder="搜索订单号、客户姓名、地址..."
        @keyup.enter="fetchOrders"
        @input="debouncedSearch"
      />
      <el-select v-model="categoryFilter" class="filter-select-el" placeholder="问题分类" clearable @change="fetchOrders">
        <el-option v-for="cat in settingsStore.serviceTypes" :key="cat" :label="cat" :value="cat" />
      </el-select>
      <el-select v-model="areaFilter" class="filter-select-el" placeholder="所属区域" clearable @change="fetchOrders">
        <el-option v-for="area in settingsStore.areas" :key="area" :label="area" :value="area" />
      </el-select>
      <el-select v-model="channelFilter" class="filter-select-el" placeholder="来源渠道" clearable @change="fetchOrders">
        <el-option v-for="channel in sourceChannelOptions" :key="channel.value" :label="channel.label" :value="channel.value" />
      </el-select>
      <button class="btn-query" @click="fetchOrders">查询</button>
      <button class="btn-reset" @click="resetFilters">重置</button>
      <button class="btn-export" style="margin-left:auto;" @click="exportOrders">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        导出Excel
      </button>
    </div>

    <!-- Data Table -->
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width:13%">订单号</th>
            <th style="width:8%">客户</th>
            <th style="width:8%">区域</th>
            <th style="width:9%">来源渠道</th>
            <th style="width:10%">问题分类</th>
            <th style="width:10%">维修师傅</th>
            <th style="width:9%">状态</th>
            <th style="width:10%">维修金额</th>
            <th style="width:10%">创建时间</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="order in orders"
            :key="order.id"
            :class="{ overdue: isOverdue(order) }"
          >
            <td><CellText class="order-id" :value="order.orderNo" @click="viewDetail(order.id)" /></td>
            <td><CellText :value="order.customerName" /></td>
            <td><CellText :value="order.area" /></td>
            <td><CellText :value="order.sourceChannel" /></td>
            <td><CellText :value="order.problemCategory" /></td>
            <td><CellText :value="order.technicianName" /></td>
            <td>
              <span class="status-badge" :class="getStatusClass(order.status)">
                {{ getStatusText(order.status) }}
              </span>
            </td>
            <td>
              <span v-if="['completed', 'callback'].includes(order.status) && (order.totalFee || order.construction?.totalFee)" class="fee-amount">¥{{ order.totalFee || order.construction?.totalFee }}</span>
              <span v-else>-</span>
            </td>
            <td><CellText :value="formatTime(order.createdAt)" /></td>
          </tr>
          <tr v-if="!loading && orders.length === 0">
            <td colspan="9" class="empty-cell">
              <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--muted-fg)" stroke-width="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                <p>暂无工单数据</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="pagination-bar">
      <div class="pagination-info">
        共 <strong>{{ pagination.total }}</strong> 条记录，每页
        <el-select v-model="pagination.pageSize" class="page-size-select" @change="pagination.page = 1; fetchOrders()">
          <el-option :value="12" label="12" />
          <el-option :value="20" label="20" />
          <el-option :value="50" label="50" />
        </el-select>
        条
      </div>
      <div class="pagination-buttons">
        <button class="page-btn nav-arrow" :disabled="pagination.page <= 1" @click="pagination.page--; fetchOrders()">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <button
          v-for="p in displayPages"
          :key="p"
          class="page-btn"
          :class="{ active: pagination.page === p }"
          @click="pagination.page = p; fetchOrders()"
        >{{ p === '...' ? '...' : p }}</button>
        <button class="page-btn nav-arrow" :disabled="pagination.page >= totalPages" @click="pagination.page++; fetchOrders()">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import api, { createCancelToken } from '@/utils/api'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { debounce } from '@/utils/debounce'
import { formatTime } from '@/utils/format'
import { exportToExcel, formatDateForExport } from '@/utils/exportExcel'
import { useSettingsStore } from '@/stores/settings'
import CellText from '@/components/CellText.vue'

const settingsStore = useSettingsStore()

const router = useRouter()
const loading = ref(false)
let fetchOrdersCancel = null
const orders = ref([])
const searchQuery = ref('')
const activeTab = ref('')
const areaFilter = ref('')
const channelFilter = ref('')
const categoryFilter = ref('')
const technicianFilter = ref('')
const pagination = ref({ page: 1, pageSize: 20, total: 0 })

// Stats data
const stats = ref({
  total: 0,
  totalTrend: 12.5,
  overdueCount: 0,
  awaitCallbackCount: 0,
  statusCounts: {}
})

// 特殊筛选模式：overdue / pendingDispatch / awaitCallback（与 tabs 互斥）
const specialFilter = ref('')

const statusTabs = computed(() => {
  const sc = stats.value.statusCounts || {}
  return [
    { label: '全部', value: '', count: stats.value.total },
    { label: '待派单', value: 'pending', count: sc.pending || 0 },
    { label: '已派单', value: 'dispatched', count: sc.dispatched || 0 },
    { label: '已完成', value: 'completed', count: sc.completed || 0 },
    { label: '已回访', value: 'callback', count: sc.callback || 0 },
    { label: '已取消', value: 'cancelled', count: sc.cancelled || 0 },
    { label: '咨询单', value: 'consultation', count: sc.consultation || 0 }
  ]
})

const sourceChannelOptions = computed(() => {
  const base = (settingsStore.channels || []).map(item => ({ label: item, value: `channel:${item}` }))
  const properties = (settingsStore.properties || []).map(item => ({ label: `物业：${item.name}`, value: `property:${item.id}` }))
  const buildingManagers = (settingsStore.buildingManagers || []).map(item => ({ label: `楼管：${item.name}`, value: `buildingManager:${item.id}` }))
  return [
    { label: '客户来电', value: 'customer' },
    ...base,
    ...properties,
    ...buildingManagers
  ]
})

const totalPages = computed(() => Math.ceil(pagination.value.total / pagination.value.pageSize) || 1)

const displayPages = computed(() => {
  const total = totalPages.value
  const current = pagination.value.page
  const pages = []
  if (total <= 5) {
    for (let i = 1; i <= total; i++) pages.push(i)
    return pages
  }
  let start = Math.max(1, current - 2)
  let end = Math.min(total, current + 2)
  if (start > 1) pages.push(1)
  if (start > 2) pages.push('...')
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < total - 1) pages.push('...')
  if (end < total) pages.push(total)
  return pages
})

function getStatusClass(status) {
  const map = {
    pending: 'pending-dispatch',
    dispatched: 'dispatched',
    completed: 'completed',
    callback: 'followed-up',
    cancelled: 'cancelled',
    consultation: 'consultation'
  }
  return map[status] || ''
}

function getStatusText(status) {
  const map = {
    pending: '待派单',
    dispatched: '已派单',
    completed: '已完成',
    callback: '已回访',
    cancelled: '已取消',
    consultation: '咨询单'
  }
  return map[status] || status
}

function isOverdue(order) {
  if (['pending', 'dispatched'].includes(order.status)) {
    const created = new Date(order.createdAt || order.receivedAt)
    const hours = (Date.now() - created.getTime()) / (1000 * 60 * 60)
    return hours > 24
  }
  return false
}

function goToCreate() {
  router.push('/orders/create')
}

function viewDetail(id) {
  router.push(`/orders/${id}`)
}

async function cancelOrder(order) {
  try {
    const { value } = await ElMessageBox.prompt('请输入取消原因', '取消工单', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /.+/,
      inputErrorMessage: '取消原因不能为空'
    })
    await api.patch(`/orders/${order.id}/cancel`, { cancelReason: value })
    ElMessage.success('工单已取消')
    await fetchOrders()
  } catch (e) {
    // cancelled
  }
}

function showAssignDialog(order) {
  selectedOrder.value = order
  selectedTechnician.value = null
  assignRemark.value = ''
  assignDialogVisible.value = true
}

async function doAssign() {
  if (!selectedTechnician.value) {
    ElMessage.warning('请选择师傅')
    return
  }
  assignLoading.value = true
  try {
    await api.post(`/orders/${selectedOrder.value.id}/assign`, {
      technicianId: selectedTechnician.value,
      remark: assignRemark.value
    })
    ElMessage.success('派单成功')
    assignDialogVisible.value = false
    await fetchOrders()
  } catch (error) {
    ElMessage.error('派单失败')
  } finally {
    assignLoading.value = false
  }
}

function resetFilters() {
  searchQuery.value = ''
  activeTab.value = ''
  specialFilter.value = ''
  areaFilter.value = ''
  channelFilter.value = ''
  categoryFilter.value = ''
  technicianFilter.value = ''
  pagination.value.page = 1
  fetchOrders()
}

function applySourceFilterParams(params) {
  if (!channelFilter.value) return

  if (channelFilter.value.startsWith('channel:')) {
    params.sourceChannel = channelFilter.value.slice('channel:'.length)
    return
  }

  if (channelFilter.value === 'customer') {
    params.sourceChannel = '客户来电'
    return
  }

  if (channelFilter.value.startsWith('property:')) {
    params.sourceType = 'property'
    params.sourcePropertyId = channelFilter.value.slice('property:'.length)
    return
  }

  if (channelFilter.value.startsWith('buildingManager:')) {
    params.sourceType = 'building_manager'
    params.sourceBuildingManagerId = channelFilter.value.slice('buildingManager:'.length)
  }
}

async function fetchOrders() {
  // 取消上一个未完成的请求
  if (fetchOrdersCancel) fetchOrdersCancel()
  const { signal, cancel } = createCancelToken()
  fetchOrdersCancel = cancel

  loading.value = true
  try {
    const params = {
      page: pagination.value.page,
      pageSize: pagination.value.pageSize
    }
    // tabs 和特殊筛选互斥
    if (activeTab.value) params.status = activeTab.value
    if (specialFilter.value === 'overdue') params.overdue = 'true'
    if (specialFilter.value === 'awaitCallback') params.awaitCallback = 'true'
    if (specialFilter.value === 'pendingDispatch') params.pendingDispatch = 'true'
    if (searchQuery.value) params.keyword = searchQuery.value
    if (areaFilter.value) params.area = areaFilter.value
    applySourceFilterParams(params)
    if (categoryFilter.value) params.problemCategory = categoryFilter.value
    if (technicianFilter.value) params.technicianId = technicianFilter.value

    const response = await api.get('/orders', { params, signal })
    orders.value = response.data.items || response.data || []
    pagination.value.total = response.data.total || orders.value.length

    // Update stats from response
    if (response.data.statusCounts) {
      stats.value.statusCounts = response.data.statusCounts
    }
    if (response.data.overdueCount !== undefined) {
      stats.value.overdueCount = response.data.overdueCount
    }
    if (response.data.awaitCallbackCount !== undefined) {
      stats.value.awaitCallbackCount = response.data.awaitCallbackCount
    }
    // Update tab counts
    const sc = response.data.statusCounts || {}
    stats.value.total = Object.values(sc).reduce((a, b) => a + b, 0)
  } catch (error) {
    if (axios.isCancel?.(error)) return
    ElMessage.error('获取工单列表失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

async function fetchTechnicians() {
  try {
    const response = await api.get('/technicians', { params: { pageSize: 100 } })
    technicians.value = response.data.items || response.data || []
  } catch (error) {
    console.error('获取师傅列表失败')
  }
}

// Debounced search - wait 300ms after user stops typing
const debouncedSearch = debounce(() => {
  pagination.value.page = 1
  fetchOrders()
}, 300)

onMounted(() => {
  if (!settingsStore.loaded) settingsStore.fetchAll()
  fetchOrders()
  fetchTechnicians()
})
onUnmounted(() => { 
  debouncedSearch.cancel()
  if (fetchOrdersCancel) fetchOrdersCancel()
})

async function exportOrders() {
  try {
    // 获取所有筛选条件下的数据（不分页）
    const params = { page: 1, pageSize: 9999 }
    // tabs 和特殊筛选互斥
    if (activeTab.value) params.status = activeTab.value
    if (specialFilter.value === 'overdue') params.overdue = 'true'
    if (specialFilter.value === 'awaitCallback') params.awaitCallback = 'true'
    if (specialFilter.value === 'pendingDispatch') params.pendingDispatch = 'true'
    if (searchQuery.value) params.keyword = searchQuery.value
    if (areaFilter.value) params.area = areaFilter.value
    applySourceFilterParams(params)
    if (categoryFilter.value) params.problemCategory = categoryFilter.value
    if (technicianFilter.value) params.technicianId = technicianFilter.value

    const response = await api.get('/orders', { params })
    const allOrders = response.data.items || response.data || []

    // 表头（对齐需求文档）
    const headers = ['订单号', '客户姓名', '联系方式', '区域', '来源渠道', '住址', '问题分类', '问题描述', '接线员', '维修师傅', '状态', '维修金额', '满意度评分', '费用是否一致']

    // 数据行
    const data = allOrders.map(o => [
      o.orderNo || '',
      o.customerName || '',
      o.customerPhone || '',
      o.area || '',
      o.sourceChannel || '',
      o.address || '',
      o.problemCategory || '',
      o.problemDescription || '',
      o.receiverName || '',
      o.technicianName || '',
      getStatusText(o.status),
      o.totalFee ? `¥${o.totalFee}` : '-',
      o.callbackRecord?.satisfaction_score ?? '-',
      o.callbackRecord?.fee_consistent === 1 ? '是' : o.callbackRecord?.fee_consistent === 0 ? '否' : '-'
    ])

    exportToExcel('工单列表', headers, data)
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error('导出失败')
    console.error(error)
  }
}
</script>

<style scoped lang="scss">
.order-list-page {
  position: relative;
  z-index: 1;
}

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
  margin: 0;
}

.btn-new-order {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
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
}
.btn-new-order:hover {
  background: #3D6FA0;
  border-color: #3D6FA0;
  box-shadow: var(--shadow-soft);
}
.btn-new-order svg {
  width: 18px;
  height: 18px;
  stroke-width: 2;
}

/* Stats Cards */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  background: var(--card-bg);
  border: 1px solid rgba(222, 216, 207, 0.5);
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: var(--shadow-soft);
  cursor: pointer;
  transition: all 0.3s ease;
}

.stat-card:nth-child(1) { border-radius: 24px 16px 24px 16px; }
.stat-card:nth-child(2) { border-radius: 16px 24px 16px 24px; }
.stat-card:nth-child(3) { border-radius: 24px 24px 16px 16px; }
.stat-card:nth-child(4) { border-radius: 16px 16px 24px 24px; }

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(74, 127, 181, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.stat-card:hover .stat-icon {
  background: var(--primary);
  color: white;
}

.stat-icon svg {
  width: 22px;
  height: 22px;
  stroke-width: 2;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 28px;
  color: var(--fg);
  line-height: 1.1;
}

.stat-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--muted-fg);
  margin-top: 2px;
}

.stat-trend {
  font-size: 11px;
  font-weight: 600;
  margin-top: 4px;
}

.stat-trend.up {
  color: var(--primary);
}

.stat-trend.down {
  color: var(--destructive);
}

/* Status Tabs */
.status-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: nowrap;
  overflow-x: auto;
}

.status-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border-radius: 999px;
  border: none;
  background: transparent;
  color: var(--muted-fg);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}
.status-tab:hover {
  background: rgba(230, 220, 205, 0.3);
}
.status-tab.active {
  background: var(--primary);
  color: white;
  box-shadow: var(--shadow-soft);
}

.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(74, 127, 181, 0.15);
  color: var(--primary);
}
.status-tab.active .tab-count {
  background: rgba(255, 255, 255, 0.25);
  color: white;
}

/* Filter Toolbar */
.filter-toolbar {
  background: rgba(240, 235, 229, 0.5);
  border-radius: 24px;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
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
.filter-input::placeholder {
  color: var(--muted-fg);
  opacity: 0.7;
}
.filter-input:focus {
  box-shadow: 0 0 0 3px rgba(74,127,181,0.15);
  border-color: var(--primary);
  background: rgba(255,255,255,0.8);
}

.filter-select {
  height: 40px;
  border-radius: 999px;
  border: 1px solid rgba(222,216,207,0.8);
  background: rgba(255,255,255,0.5);
  padding: 0 16px;
  padding-right: 36px;
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--fg);
  outline: none;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%2378786C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  transition: all 0.2s ease;
  min-width: 120px;
}

.filter-select-el {
  width: 200px !important;
  flex-shrink: 0;
  :deep(.el-select__wrapper) {
    border-radius: 999px !important;
    min-height: 40px !important;
    height: 40px !important;
    padding: 0 36px 0 16px !important;
    background: rgba(255,255,255,0.5) !important;
    box-shadow: 0 0 0 1px rgba(222,216,207,0.8) !important;
    box-sizing: border-box !important;
    display: flex !important;
    align-items: center !important;
  }
  :deep(.el-select__placeholder) {
    font-size: 14px !important;
    color: var(--fg) !important;
    line-height: 40px !important;
  }
  :deep(.el-select__selected-item) {
    font-size: 14px !important;
    color: var(--fg) !important;
    line-height: 40px !important;
  }
  :deep(.el-select__suffix) {
    right: 16px !important;
  }
  :deep(.el-select__caret) {
    color: #78786C !important;
  }
}
.filter-select:focus {
  box-shadow: 0 0 0 3px rgba(74,127,181,0.15);
  border-color: var(--primary);
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

.btn-export {
  display: inline-flex;
  align-items: center;
  gap: 6px;
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
.btn-export:hover {
  background: rgba(232,184,75,0.08);
  transform: scale(1.05);
}
.btn-export:active { transform: scale(0.95); }

/* Data Table */
.table-container {
  background: var(--card-bg);
  border: 1px solid rgba(222, 216, 207, 0.5);
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
.data-table thead th:first-child {
  padding-left: 24px;
}
.data-table thead th:last-child {
  padding-right: 24px;
  text-align: center;
}

.data-table tbody tr {
  height: 48px;
  transition: background 0.3s ease;
}
.data-table tbody tr:hover {
  background: rgba(240, 235, 229, 0.4);
}
.data-table tbody tr.overdue {
  background: rgba(212, 114, 106, 0.06);
}
.data-table tbody tr.overdue:hover {
  background: rgba(212, 114, 106, 0.1);
}

.data-table tbody td {
  padding: 0 16px;
  font-size: 13px;
  color: var(--fg);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.data-table tbody td:first-child {
  padding-left: 24px;
}
.data-table tbody td:last-child {
  padding-right: 24px;
  text-align: center;
}

.order-id {
  font-weight: 600;
  color: var(--primary);
  cursor: pointer;
}
.order-id:hover {
  text-decoration: underline;
}

/* Status Badge */
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
.status-badge.pending-dispatch {
  background: rgba(74, 127, 181, 0.12);
  color: #4A7FB5;
}
.status-badge.dispatched {
  background: rgba(232, 184, 75, 0.12);
  color: #B8922E;
}
.status-badge.in-progress {
  background: rgba(232, 184, 75, 0.2);
  color: #9A7A1F;
}
.status-badge.completed {
  background: rgba(74, 127, 181, 0.15);
  color: #3D6A9A;
}
.status-badge.followed-up {
  background: rgba(74, 127, 181, 0.1);
  color: #4A7FB5;
}
.status-badge.cancelled {
  background: rgba(212, 114, 106, 0.1);
  color: #D4726A;
}
.status-badge.consultation {
  background: rgba(120, 120, 108, 0.1);
  color: #78786C;
}

/* Action buttons */
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
.action-btn:hover {
  background: rgba(74, 127, 181, 0.08);
  color: #3D6A9A;
}
.action-btn + .action-btn {
  margin-left: 4px;
}
.action-btn.danger {
  color: var(--destructive);
}
.action-btn.danger:hover {
  background: rgba(212, 114, 106, 0.08);
}

/* Pagination */
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

.pagination-info strong {
  color: var(--fg);
  font-weight: 600;
}

.pagination-info select {
  border: none;
  background: transparent;
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--muted-fg);
  cursor: pointer;
  outline: none;
  margin: 0 4px;
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
.page-btn:hover:not(:disabled) {
  background: rgba(230, 220, 205, 0.4);
}
.page-btn.active {
  background: var(--primary);
  color: white;
  box-shadow: var(--shadow-soft);
}
.page-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.page-btn.nav-arrow {
  padding: 0 10px;
}
.page-btn svg {
  width: 16px;
  height: 16px;
  stroke-width: 2;
}

/* Empty State */
.empty-cell {
  text-align: center !important;
  padding: 48px 24px !important;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--muted-fg);
  font-size: 14px;
}

.dispatch-section h4 {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 14px;
  color: var(--fg);
  margin: 0 0 12px 0;
}

.technician-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tech-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 2px solid var(--border);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tech-card:hover {
  border-color: var(--primary);
  background: rgba(74, 127, 181, 0.04);
}

.tech-card.selected {
  border-color: var(--primary);
  background: rgba(74, 127, 181, 0.08);
}

.tech-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(74, 127, 181, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 16px;
  color: var(--primary);
  flex-shrink: 0;
}

.tech-info {
  flex: 1;
}

.tech-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--fg);
}

.tech-specialty {
  font-size: 12px;
  color: var(--muted-fg);
}

.form-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted-fg);
  margin-bottom: 6px;
}
</style>
