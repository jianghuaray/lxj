<template>
  <div class="customer-list-page">
    <div class="page-header">
      <h1 class="page-title">客户管理</h1>
      <button class="btn-new-order" @click="$router.push('/customers/add')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        添加客户
      </button>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card" :class="{ active: activeCard === 'all' }" @click="filterByCard('all')">
        <div class="stat-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">客户总数</div>
        </div>
      </div>
      <div class="stat-card" :class="{ active: activeCard === 'new' }" @click="filterByCard('new')">
        <div class="stat-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.newThisMonth }}</div>
          <div class="stat-label">本月新增</div>
        </div>
      </div>
    </div>

    <!-- Filter Toolbar -->
    <div class="filter-toolbar">
      <el-input v-model="searchQuery" class="filter-input-el" placeholder="搜索姓名/手机号/地址" clearable @keyup.enter="fetchCustomers" @input="debouncedSearch">
        <template #prefix>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;color:var(--muted-fg)"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </template>
      </el-input>
      <el-select v-model="areaFilter" class="filter-select-el" placeholder="全部区域" clearable @change="fetchCustomers">
        <el-option v-for="area in areas" :key="area" :label="area" :value="area" />
      </el-select>
      <button class="btn-query" @click="fetchCustomers">查询</button>
      <button class="btn-reset" @click="resetFilters">重置</button>
      <button class="btn-export" style="margin-left:auto;" @click="exportCustomers">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        导出Excel
      </button>
    </div>

    <!-- Data Table -->
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width:7%">姓名</th>
            <th style="width:10%">手机号</th>
            <th style="width:7%">区域</th>
            <th style="width:16%">地址</th>
            <th style="width:14%">标签</th>
            <th style="width:7%">累计工单</th>
            <th style="width:8%">累计消费</th>
            <th style="width:9%">最近报修</th>
            <th style="width:14%">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="customer in customers" :key="customer.id" @click="viewDetail(customer.id)" style="cursor:pointer;">
            <td><CellText :value="customer.name" /></td>
            <td><CellText :value="customer.phone" /></td>
            <td><CellText :value="customer.area" /></td>
            <td><CellText :value="customer.address" :lines="2" /></td>
            <td>
              <el-tooltip :content="formatTags(customer.tags)" :disabled="!(customer.tags || []).length" placement="top" :show-after="250">
                <div class="tags-cell">
                  <span v-for="(tag, i) in (customer.tags || []).slice(0, 3)" :key="tag" :class="['tag-badge', getTagClass(i)]">{{ tag }}</span>
                  <span v-if="(customer.tags || []).length > 3" class="tag-badge tag-weekend">+{{ customer.tags.length - 3 }}</span>
                  <span v-if="!(customer.tags || []).length" class="muted-cell">-</span>
                </div>
              </el-tooltip>
            </td>
            <td>{{ customer.totalOrders || 0 }}</td>
            <td>¥{{ customer.totalAmount || 0 }}</td>
            <td><CellText :value="formatDate(customer.lastOrderAt)" /></td>
            <td>
              <button class="action-btn" @click.stop="viewDetail(customer.id)">查看</button>
              <button class="action-btn" @click.stop="$router.push(`/customers/edit/${customer.id}`)">编辑</button>
            </td>
          </tr>
          <tr v-if="!loading && customers.length === 0">
            <td colspan="9" class="empty-cell">
              <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--muted-fg)" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <p>暂无客户数据</p>
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
        <el-select v-model="pagination.pageSize" class="page-size-select" @change="pagination.page = 1; fetchCustomers()">
          <el-option :value="12" label="12" />
          <el-option :value="20" label="20" />
          <el-option :value="50" label="50" />
        </el-select>
        条
      </div>
      <div class="pagination-buttons">
        <button class="page-btn nav-arrow" :disabled="pagination.page <= 1" @click="pagination.page--; fetchCustomers()">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <button
          v-for="p in displayPages"
          :key="p"
          class="page-btn"
          :class="{ active: pagination.page === p }"
          @click="goToPage(p)"
        >{{ p }}</button>
        <button class="page-btn nav-arrow" :disabled="pagination.page >= totalPages" @click="pagination.page++; fetchCustomers()">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
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
import { formatDate } from '@/utils/format'
import { exportToExcel, formatDateForExport } from '@/utils/exportExcel'
import CellText from '@/components/CellText.vue'

const router = useRouter()
const loading = ref(false)
let fetchCustomersCancel = null
const customers = ref([])

const formatTags = (tags = []) => (tags || []).length ? tags.join('、') : '-'
const searchQuery = ref('')
const areaFilter = ref('')
const activeCard = ref('all')
const pagination = ref({ page: 1, pageSize: 12, total: 0 })

const stats = ref({ total: 0, newThisMonth: 0 })
const areas = ['新城区', '未央区', '高新区', '灞桥区']

const totalPages = computed(() => Math.max(1, Math.ceil(pagination.value.total / pagination.value.pageSize)))

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

function filterByCard(type) {
  activeCard.value = type
  pagination.value.page = 1
  
  if (type === 'all') {
    fetchCustomers()
  } else if (type === 'new') {
    fetchNewCustomers()
  }
}

function getTagClass(index) {
  const classes = ['tag-owner', 'tag-price', 'tag-weekend']
  return classes[index % 3]
}

function viewDetail(id) {
  router.push(`/customers/${id}`)
}

function goToPage(p) {
  if (p !== '...') {
    pagination.value.page = p
    fetchCustomers()
  }
}


function resetFilters() {
  searchQuery.value = ''
  areaFilter.value = ''
  activeCard.value = 'all'
  pagination.value.page = 1
  fetchCustomers()
}

async function fetchStats() {
  try {
    // 获取统计数据 - 请求大页码获取所有数据来计算统计
    const response = await api.get('/customers', { params: { page: 1, pageSize: 9999 } })
    const allCustomers = response.data.items || response.data || []
    
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    stats.value.total = allCustomers.length
    stats.value.newThisMonth = allCustomers.filter(c => {
      if (!c.createdAt) return false
      const createdAt = new Date(c.createdAt)
      return createdAt >= startOfMonth
    }).length
  } catch (error) {
    console.error('获取统计数据失败', error)
  }
}

async function fetchNewCustomers(signal) {
  loading.value = true
  try {
    const params = { page: 1, pageSize: 9999 }
    if (searchQuery.value) params.keyword = searchQuery.value
    if (areaFilter.value) params.area = areaFilter.value
    
    const response = await api.get('/customers', { params, signal })
    const allCustomers = response.data.items || response.data || []
    
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    // 筛选本月新增的客户
    const newCustomers = allCustomers.filter(c => {
      if (!c.createdAt) return false
      const createdAt = new Date(c.createdAt)
      return createdAt >= startOfMonth
    })
    
    // 分页处理
    const start = (pagination.value.page - 1) * pagination.value.pageSize
    const end = start + pagination.value.pageSize
    customers.value = newCustomers.slice(start, end)
    pagination.value.total = newCustomers.length
  } catch (error) {
    if (axios.isCancel?.(error)) return
    ElMessage.error('获取客户列表失败')
  } finally {
    loading.value = false
  }
}

async function fetchCustomers() {
  // 取消上一个未完成的请求
  if (fetchCustomersCancel) fetchCustomersCancel()
  const { signal, cancel } = createCancelToken()
  fetchCustomersCancel = cancel

  loading.value = true
  try {
    // 如果是"本月新增"卡片，使用特殊处理
    if (activeCard.value === 'new') {
      await fetchNewCustomers(signal)
      return
    }
    
    const params = { page: pagination.value.page, pageSize: pagination.value.pageSize }
    if (searchQuery.value) params.keyword = searchQuery.value
    if (areaFilter.value) params.area = areaFilter.value
    const response = await api.get('/customers', { params, signal })
    customers.value = response.data.items || response.data || []
    pagination.value.total = response.data.total || customers.value.length
  } catch (error) {
    if (axios.isCancel?.(error)) return
    ElMessage.error('获取客户列表失败')
  } finally {
    loading.value = false
  }
}

// 获取统计数据
async function loadStats() {
  await fetchStats()
}

// Debounced search - wait 300ms after user stops typing
const debouncedSearch = debounce(() => {
  pagination.value.page = 1
  fetchCustomers()
}, 300)

onMounted(() => { 
  fetchCustomers()
  loadStats()
})
async function exportCustomers() {
  try {
    // 获取所有筛选条件下的数据（不分页）
    const params = { page: 1, pageSize: 9999 }
    if (searchQuery.value) params.keyword = searchQuery.value
    if (areaFilter.value) params.area = areaFilter.value
    
    const response = await api.get('/customers', { params })
    let allCustomers = response.data.items || response.data || []
    
    // 如果是"本月新增"卡片，进行客户端筛选
    if (activeCard.value === 'new') {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      allCustomers = allCustomers.filter(c => {
        if (!c.createdAt) return false
        return new Date(c.createdAt) >= startOfMonth
      })
    }
    
    // 表头
    const headers = ['姓名', '手机号', '区域', '地址', '标签', '累计工单', '累计消费', '最近报修']
    
    // 数据行
    const data = allCustomers.map(c => [
      c.name || '',
      c.phone || '',
      c.area || '',
      c.address || '',
      (c.tags || []).join('、'),
      c.totalOrders || 0,
      c.totalAmount || 0,
      formatDateForExport(c.lastOrderAt)
    ])
    
    exportToExcel('客户列表', headers, data)
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error('导出失败')
    console.error(error)
  }
}

onUnmounted(() => { 
  debouncedSearch.cancel()
  if (fetchCustomersCancel) fetchCustomersCancel()
})
</script>

<style scoped lang="scss">
.customer-list-page { position: relative; z-index: 1; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.page-title { font-family: var(--font-display); font-weight: 700; font-size: 24px; color: var(--fg); margin: 0; }
.btn-new-order { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 36px; padding: 0 20px; border-radius: 999px; border: 1.5px solid var(--primary); background: var(--primary); color: white; font-family: var(--font-body); font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: var(--shadow-soft); transition: all 0.2s ease; }
.btn-new-order:hover { background: #3D6FA0; border-color: #3D6FA0; box-shadow: var(--shadow-soft); }
.btn-new-order svg { width: 18px; height: 18px; stroke-width: 2; }

/* Stats Cards */
.stats-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-bottom: 20px; }
.stat-card { background: var(--card-bg); border: 1px solid rgba(222,216,207,0.5); padding: 20px; display: flex; align-items: center; gap: 16px; box-shadow: var(--shadow-soft); cursor: pointer; transition: all 0.3s ease; }
.stat-card:nth-child(1) { border-radius: 24px 16px 24px 16px; }
.stat-card:nth-child(2) { border-radius: 16px 24px 16px 24px; }
.stat-card:nth-child(3) { border-radius: 24px 24px 16px 16px; }
.stat-card:nth-child(4) { border-radius: 16px 16px 24px 24px; }
.stat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-hover); }
.stat-card.active { border-color: var(--primary); box-shadow: 0 0 0 2px rgba(74,127,181,0.2); }
.stat-card.active .stat-icon { background: var(--primary); color: white; }
.stat-icon { width: 48px; height: 48px; border-radius: 50%; background: rgba(74,127,181,0.1); display: flex; align-items: center; justify-content: center; color: var(--primary); transition: all 0.3s ease; flex-shrink: 0; }
.stat-card:hover .stat-icon { background: var(--primary); color: white; }
.stat-card:nth-child(2) .stat-icon { background: rgba(232,184,75,0.15); color: var(--secondary); }
.stat-card:nth-child(2):hover .stat-icon { background: var(--secondary); color: white; }
.stat-icon svg { width: 22px; height: 22px; stroke-width: 2; }
.stat-info { flex: 1; }
.stat-value { font-family: var(--font-display); font-weight: 700; font-size: 28px; color: var(--fg); line-height: 1.1; }
.stat-label { font-size: 12px; font-weight: 500; color: var(--muted-fg); margin-top: 2px; }
.stat-trend { font-size: 11px; font-weight: 600; margin-top: 4px; }
.stat-trend.up { color: var(--primary); }
.stat-trend.down { color: var(--destructive); }

.filter-toolbar { background: rgba(240,235,229,0.5); border-radius: 24px; padding: 14px 20px; display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.filter-input { flex: 1; height: 40px; border-radius: 999px; border: 1px solid rgba(222,216,207,0.8); background: rgba(255,255,255,0.5); padding: 0 16px; font-family: var(--font-body); font-size: 14px; color: var(--fg); outline: none; transition: all 0.2s ease; min-width: 200px; }
.filter-input::placeholder { color: var(--muted-fg); opacity: 0.7; }
.filter-input:focus { box-shadow: 0 0 0 3px rgba(74,127,181,0.15); border-color: var(--primary); background: rgba(255,255,255,0.8); }
.filter-select { height: 40px; border-radius: 999px; border: 1px solid rgba(222,216,207,0.8); background: rgba(255,255,255,0.5); padding: 0 16px; padding-right: 36px; font-family: var(--font-body); font-size: 14px; color: var(--fg); outline: none; cursor: pointer; appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%2378786C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; transition: all 0.2s ease; min-width: 120px; }
.filter-select:focus { box-shadow: 0 0 0 3px rgba(74,127,181,0.15); border-color: var(--primary); }

.filter-input-el {
  flex: 1;
  min-width: 200px;
  :deep(.el-input) {
    height: 40px !important;
  }
  :deep(.el-input__wrapper) {
    border-radius: 999px !important;
    height: 40px !important;
    min-height: 40px !important;
    padding: 0 16px !important;
    background: rgba(255,255,255,0.5) !important;
    box-shadow: 0 0 0 1px rgba(222,216,207,0.8) !important;
    box-sizing: border-box !important;
    display: flex !important;
    align-items: center !important;
  }
  :deep(.el-input__inner) {
    height: 40px !important;
    line-height: 40px !important;
    font-size: 14px !important;
    color: var(--fg) !important;
  }
  :deep(.el-input__prefix-inner) {
    color: var(--muted-fg) !important;
  }
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
.btn-query { height: 36px; padding: 0 20px; border-radius: 999px; border: 1.5px solid var(--primary); background: var(--primary); color: white; font-family: var(--font-body); font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: var(--shadow-soft); transition: all 0.2s ease; white-space: nowrap; }
.btn-query:hover { background: #3D6FA0; border-color: #3D6FA0; box-shadow: var(--shadow-soft); }
.btn-reset { height: 36px; padding: 0 20px; border-radius: 999px; border: 1.5px solid var(--secondary); background: transparent; color: var(--secondary); font-family: var(--font-body); font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; white-space: nowrap; }
.btn-reset:hover { background: rgba(232,184,75,0.08); }

.btn-export { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 20px; border-radius: 999px; border: 1.5px solid var(--secondary); background: transparent; color: var(--secondary); font-family: var(--font-body); font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; white-space: nowrap; }
.btn-export:hover { background: rgba(232,184,75,0.08); transform: scale(1.05); }
.btn-export:active { transform: scale(0.95); }

.table-container { background: var(--card-bg); border: 1px solid rgba(222,216,207,0.5); border-radius: 24px; box-shadow: var(--shadow-soft); overflow: hidden; margin-bottom: 16px; }
.data-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.data-table thead th { padding: 14px 16px; font-size: 12px; font-weight: 600; color: var(--muted-fg); text-align: left; border-bottom: 1px solid var(--border); white-space: nowrap; background: transparent; }
.data-table thead th:first-child { padding-left: 24px; }
.data-table thead th:last-child { padding-right: 24px; text-align: center; }
.data-table tbody tr { height: 48px; transition: background 0.3s ease; }
.data-table tbody tr:hover { background: rgba(240,235,229,0.4); }
.data-table tbody td { padding: 0 16px; font-size: 13px; color: var(--fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.data-table tbody td:first-child { padding-left: 24px; }
.data-table tbody td:last-child { padding-right: 24px; text-align: center; }

/* Tag badges */
.tags-cell { display: flex; gap: 4px; flex-wrap: wrap; }
.tag-badge { display: inline-flex; align-items: center; height: 24px; padding: 0 10px; border-radius: 999px; font-size: 11px; font-weight: 500; white-space: nowrap; margin: 1px 2px; }
.tag-badge.tag-owner { background: rgba(74,127,181,0.08); color: #4A7FB5; }
.tag-badge.tag-price { background: rgba(232,184,75,0.1); color: #B8922E; }
.tag-badge.tag-weekend { background: rgba(120,120,108,0.08); color: #78786C; }
.tag-badge.tag-elderly { background: rgba(212,114,106,0.08); color: #D4726A; }

/* Action buttons */
.action-btn { background: none; border: none; color: var(--primary); font-family: var(--font-body); font-size: 13px; font-weight: 500; cursor: pointer; padding: 4px 8px; border-radius: 8px; transition: all 0.3s ease; }
.action-btn:hover { background: rgba(74,127,181,0.08); color: #3D6A9A; }
.action-btn + .action-btn { margin-left: 4px; }

/* Pagination */
.pagination-bar { display: flex; align-items: center; justify-content: space-between; padding: 0 4px; }
.pagination-info { font-size: 13px; color: var(--muted-fg); }
.pagination-info strong { color: var(--fg); font-weight: 600; }
.pagination-info select { border: none; background: transparent; font-family: var(--font-body); font-size: 13px; color: var(--muted-fg); cursor: pointer; outline: none; margin: 0 4px; }
.pagination-buttons { display: flex; align-items: center; gap: 6px; }
.page-btn { min-width: 36px; height: 36px; border-radius: 999px; border: none; background: transparent; color: var(--muted-fg); font-family: var(--font-body); font-size: 13px; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease; }
.page-btn:hover { background: rgba(230,220,205,0.4); }
.page-btn.active { background: var(--primary); color: white; box-shadow: var(--shadow-soft); }
.page-btn.nav-arrow { padding: 0 10px; }
.page-btn svg { width: 16px; height: 16px; stroke-width: 2; }

.empty-cell { text-align: center !important; padding: 48px 24px !important; }
.empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; color: var(--muted-fg); font-size: 14px; }

.native-select { width: 100%; height: 40px; border-radius: 999px; border: 1px solid rgba(222,216,207,0.8); background: rgba(255,255,255,0.5); padding: 0 16px; font-family: var(--font-body); font-size: 14px; color: var(--fg); outline: none; cursor: pointer; appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%2378786C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; padding-right: 36px; transition: all 0.2s ease; }
.native-select:focus { box-shadow: 0 0 0 3px rgba(74,127,181,0.15); border-color: var(--primary); }
</style>
