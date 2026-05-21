<template>
  <div class="fee-list-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">财务对账</h1>
        <p class="page-subtitle">按渠道与参与方汇总订单分成和收款情况，便于财务核对</p>
      </div>
      <button class="btn-export" @click="exportExcel">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        导出 Excel
      </button>
    </div>

    <!-- Filter Toolbar -->
    <div class="filter-toolbar">
      <span class="filter-label">时间范围</span>
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="-"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        value-format="YYYY-MM-DD"
        class="filter-date-range"
        @change="fetchData"
      />
      <el-select v-model="technicianFilter" placeholder="全部师傅" clearable class="filter-select-el" @change="fetchData">
        <el-option v-for="tech in technicians" :key="tech.id" :label="tech.name" :value="tech.id" />
      </el-select>
      <el-select v-model="areaFilter" placeholder="全部区域" clearable class="filter-select-el" @change="fetchData">
        <el-option v-for="area in settingsStore.areas" :key="area" :label="area" :value="area" />
      </el-select>
      <el-select v-model="channelFilter" placeholder="全部渠道" clearable class="filter-select-el" @change="fetchData">
        <el-option v-for="channel in sourceChannelOptions" :key="channel.value" :label="channel.label" :value="channel.value" />
      </el-select>
      <el-select v-model="propertyFilter" placeholder="全部物业" clearable class="filter-select-el" @change="fetchData">
        <el-option v-for="item in settingsStore.properties" :key="item.id" :label="item.name" :value="item.id" />
      </el-select>
      <el-select v-model="buildingManagerFilter" placeholder="全部楼管" clearable class="filter-select-el" @change="fetchData">
        <el-option v-for="item in filteredBuildingManagers" :key="item.id" :label="item.name" :value="item.id" />
      </el-select>
      <button class="btn-query" @click="fetchData">查询</button>
      <button class="btn-reset" @click="resetFilters">重置</button>
    </div>

    <!-- Summary Cards (6 small) -->
    <div class="summary-grid">
      <div class="summary-card">
        <div class="card-value">¥{{ formatNumber(summary.orderAmount) }}</div>
        <div class="card-label">总订单额</div>
      </div>
      <div class="summary-card">
        <div class="card-value">¥{{ formatNumber(summary.shareBaseAmount) }}</div>
        <div class="card-label">可分成金额</div>
      </div>
      <div class="summary-card">
        <div class="card-value blue">¥{{ formatNumber(summary.technicianAmount) }}</div>
        <div class="card-label">师傅分成</div>
      </div>
      <div class="summary-card">
        <div class="card-value blue">¥{{ formatNumber(summary.propertyAmount) }}</div>
        <div class="card-label">物业分成</div>
      </div>
      <div class="summary-card">
        <div class="card-value red">¥{{ formatNumber(summary.buildingManagerAmount) }}</div>
        <div class="card-label">楼管分成</div>
      </div>
      <div class="summary-card">
        <div class="card-value">¥{{ formatNumber(summary.materialCost) }}</div>
        <div class="card-label">材料成本</div>
      </div>
      <div class="summary-card">
        <div class="card-value">¥{{ formatNumber(summary.receivedAmount) }}</div>
        <div class="card-label">实收金额</div>
      </div>
    </div>

    <!-- Profit Card (large, prominent) -->
    <div class="profit-card">
      <div class="profit-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      </div>
      <div class="profit-info">
        <div class="profit-value">¥{{ formatNumber(summary.companyAmount) }}</div>
        <div class="profit-label">公司实得</div>
      </div>
    </div>

    <!-- Data Table -->
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width:12%">订单号</th>
            <th style="width:8%">客户姓名</th>
            <th style="width:8%">维修师傅</th>
            <th style="width:8%">渠道</th>
            <th style="width:8%">订单总额</th>
            <th style="width:8%">可分成</th>
            <th style="width:8%">师傅分成</th>
            <th style="width:8%">物业分成</th>
            <th style="width:8%">楼管分成</th>
            <th style="width:8%">材料成本</th>
            <th style="width:8%">公司实得</th>
            <th style="width:8%">实收金额</th>
            <th style="width:10%">完成时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in feeList" :key="item.id">
            <td><span class="order-id" @click="viewOrderDetail(item.orderId)">{{ item.orderNo }}</span></td>
            <td>{{ item.customerName }}</td>
            <td>{{ item.technicianName }}</td>
            <td>{{ item.sourceChannel || '-' }}</td>
            <td><span class="amount">¥{{ formatNumber(item.orderAmount) }}</span></td>
            <td><span class="amount">¥{{ formatNumber(item.shareBaseAmount) }}</span></td>
            <td><span class="amount">¥{{ formatNumber(item.technicianAmount) }}</span></td>
            <td><span class="amount">¥{{ formatNumber(item.propertyAmount) }}</span></td>
            <td><span class="amount">¥{{ formatNumber(item.buildingManagerAmount) }}</span></td>
            <td><span class="amount">¥{{ formatNumber(item.materialCost) }}</span></td>
            <td><span class="amount">¥{{ formatNumber(item.companyAmount) }}</span></td>
            <td><span class="amount">¥{{ formatNumber(item.receivedAmount) }}</span></td>
            <td>{{ formatDate(item.completedAt) }}</td>
          </tr>
          <tr v-if="!loading && feeList.length === 0">
            <td colspan="13" class="empty-cell">
              <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--muted-fg)" stroke-width="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="12" y1="18" x2="12" y2="12"/>
                  <line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
                <p>暂无对账数据</p>
              </div>
            </td>
          </tr>
        </tbody>
        <tfoot v-if="feeList.length > 0">
          <tr>
            <td><span class="total-label">合计</span></td>
            <td></td>
            <td></td>
            <td></td>
            <td><span class="total-amount">¥{{ formatNumber(summary.orderAmount) }}</span></td>
            <td><span class="total-amount">¥{{ formatNumber(summary.shareBaseAmount) }}</span></td>
            <td><span class="total-amount">¥{{ formatNumber(summary.technicianAmount) }}</span></td>
            <td><span class="total-amount">¥{{ formatNumber(summary.propertyAmount) }}</span></td>
            <td><span class="total-amount">¥{{ formatNumber(summary.buildingManagerAmount) }}</span></td>
            <td><span class="total-amount">¥{{ formatNumber(summary.materialCost) }}</span></td>
            <td><span class="total-amount">¥{{ formatNumber(summary.companyAmount) }}</span></td>
            <td><span class="total-amount">¥{{ formatNumber(summary.receivedAmount) }}</span></td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Pagination -->
    <div class="pagination-bar">
      <div class="pagination-info">
        共 <strong>{{ pagination.total }}</strong> 条记录
      </div>
      <div class="pagination-buttons">
        <button class="page-btn nav-arrow" :disabled="pagination.page <= 1" @click="pagination.page--; fetchData()">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <button
          v-for="p in displayPages"
          :key="p"
          class="page-btn"
          :class="{ active: pagination.page === p }"
          @click="p !== '...' && (pagination.page = p) && fetchData()"
        >{{ p === '...' ? '...' : p }}</button>
        <button class="page-btn nav-arrow" :disabled="pagination.page >= totalPages" @click="pagination.page++; fetchData()">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/utils/api'
import { ElMessage } from 'element-plus'
import { formatTime } from '@/utils/format'
import { useSettingsStore } from '@/stores/settings'
import * as XLSX from 'xlsx'

const settingsStore = useSettingsStore()

const router = useRouter()
const loading = ref(false)
const feeList = ref([])
const dateRange = ref([])
const technicianFilter = ref('')
const areaFilter = ref('')
const channelFilter = ref('')
const propertyFilter = ref('')
const buildingManagerFilter = ref('')
const technicians = ref([])

const pagination = ref({ page: 1, pageSize: 20, total: 0 })

const summary = ref({
  orderAmount: 0,
  shareBaseAmount: 0,
  technicianAmount: 0,
  propertyAmount: 0,
  buildingManagerAmount: 0,
  companyAmount: 0,
  receivedAmount: 0,
  collectionDifference: 0,
  materialCost: 0,
  totalFee: 0,
  receivedFee: 0
})

const filteredBuildingManagers = computed(() => {
  return settingsStore.buildingManagers
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

function formatNumber(num) {
  if (num === null || num === undefined) return '0'
  return Number(num).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function viewOrderDetail(orderId) {
  router.push(`/orders/${orderId}`)
}

function resetFilters() {
  dateRange.value = []
  technicianFilter.value = ''
  areaFilter.value = ''
  channelFilter.value = ''
  propertyFilter.value = ''
  buildingManagerFilter.value = ''
  pagination.value.page = 1
  // Set default to current month
  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  dateRange.value = [
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0]
  ]
  fetchData()
}

function syncBuildingManagerFilter() {
  if (!buildingManagerFilter.value) return
  const matched = filteredBuildingManagers.value.find(item => item.id === buildingManagerFilter.value)
  if (!matched) {
    buildingManagerFilter.value = ''
  }
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

async function fetchData() {
  loading.value = true
  try {
    const params = {
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
      // 默认只看已完成和已回访
      statuses: ['completed', 'callback']
    }
    
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    if (technicianFilter.value) params.technicianId = technicianFilter.value
    if (areaFilter.value) params.area = areaFilter.value
    applySourceFilterParams(params)
    if (propertyFilter.value) params.propertyId = propertyFilter.value
    if (buildingManagerFilter.value) params.buildingManagerId = buildingManagerFilter.value

    const response = await api.get('/construction/fees', { params })
    feeList.value = response.data.items || response.data || []
    pagination.value.total = response.data.total || feeList.value.length
    
    // Update summary
    if (response.data.summary) {
      summary.value = response.data.summary
    }
  } catch (error) {
    console.error('获取费用数据失败', error)
    feeList.value = []
    summary.value = {}
  } finally {
    loading.value = false
  }
}

async function fetchTechnicians() {
  try {
    const response = await api.get('/technicians', { params: { pageSize: 100, status: 1 } })
    technicians.value = response.data.items || response.data || []
  } catch (error) {
    console.error('获取师傅列表失败')
    technicians.value = []
  }
}

async function exportExcel() {
  ElMessage.info('正在导出Excel...')
  try {
    // 获取所有符合条件的数据（不分页）
    const params = {
      page: 1,
      pageSize: 9999,
      statuses: ['completed', 'callback']
    }
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    if (technicianFilter.value) params.technicianId = technicianFilter.value
    if (areaFilter.value) params.area = areaFilter.value
    applySourceFilterParams(params)
    if (propertyFilter.value) params.propertyId = propertyFilter.value
    if (buildingManagerFilter.value) params.buildingManagerId = buildingManagerFilter.value

    const response = await api.get('/construction/fees', { params })
    const data = response.data.items || []

    if (!data.length) {
      ElMessage.warning('暂无数据可导出')
      return
    }

    // 构造 Excel 数据
    const headers = ['订单号', '客户姓名', '维修师傅', '来源渠道', '订单总额', '可分成金额', '师傅分成', '物业分成', '楼管分成', '材料成本', '公司实得', '实收金额', '完成时间']
    const rows = data.map(item => [
      item.orderNo,
      item.customerName,
      item.technicianName,
      item.sourceChannel || '',
      item.orderAmount,
      item.shareBaseAmount,
      item.technicianAmount,
      item.propertyAmount,
      item.buildingManagerAmount,
      item.materialCost,
      item.companyAmount,
      item.receivedAmount,
      formatDate(item.completedAt)
    ])

    // 合计行
    const summary = response.data.summary || {}
    rows.push([
      '合计', '', '',
      '',
      summary.orderAmount,
      summary.shareBaseAmount,
      summary.technicianAmount,
      summary.propertyAmount,
      summary.buildingManagerAmount,
      summary.materialCost,
      summary.companyAmount,
      summary.receivedAmount,
      ''
    ])

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '财务对账')

    // 文件名：财务对账_YYYYMMDD
    const now = new Date()
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    XLSX.writeFile(wb, `财务对账_${dateStr}.xlsx`)
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败', error)
    ElMessage.error('导出失败，请重试')
  }
}



onMounted(() => {
  if (!settingsStore.loaded) settingsStore.fetchAll()
  // Set default date range to current month
  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  dateRange.value = [
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0]
  ]
  fetchTechnicians()
  fetchData()
})

watch(propertyFilter, () => {
  syncBuildingManagerFilter()
})
</script>

<style scoped lang="scss">
.fee-list-page {
  position: relative;
  z-index: 1;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
}

.page-header-left {}

.page-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 24px;
  color: var(--fg);
  margin: 0;
}

.page-subtitle {
  font-size: 13px;
  color: var(--muted-fg);
  margin-top: 4px;
  font-weight: 400;
}

.btn-export {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 24px;
  border-radius: 999px;
  border: 2px solid var(--secondary);
  background: transparent;
  color: var(--secondary);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.btn-export:hover {
  background: rgba(232, 184, 75, 0.08);
  transform: scale(1.05);
}

.btn-export:active {
  transform: scale(0.95);
}

.btn-export svg {
  width: 18px;
  height: 18px;
  stroke-width: 2;
}

/* Filter Toolbar */
.filter-toolbar {
  background: rgba(240, 235, 229, 0.5);
  border-radius: 24px;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--fg);
  white-space: nowrap;
}

.filter-date-range {
  width: 240px !important;
  :deep(.el-range-input) {
    font-size: 14px;
  }
  :deep(.el-range-separator) {
    color: var(--muted-fg);
  }
}

.filter-select-el {
  width: 140px !important;
  flex-shrink: 0;
  :deep(.el-select__wrapper) {
    border-radius: 999px !important;
    min-height: 40px !important;
    height: 40px !important;
    padding: 0 36px 0 16px !important;
    background: rgba(255, 255, 255, 0.5) !important;
    box-shadow: 0 0 0 1px rgba(222, 216, 207, 0.8) !important;
    box-sizing: border-box !important;
    display: flex !important;
    align-items: center !important;
  }
  :deep(.el-select__placeholder),
  :deep(.el-select__selected-item) {
    font-size: 14px !important;
    color: var(--fg) !important;
    line-height: 40px !important;
  }
}

.btn-query {
  height: 40px;
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

.btn-query:active {
  transform: scale(0.95);
}

.btn-reset {
  height: 40px;
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
  background: rgba(232, 184, 75, 0.08);
  transform: scale(1.05);
}

.btn-reset:active {
  transform: scale(0.95);
}

/* Summary Cards */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 14px;
}

.summary-card {
  background: var(--card-bg);
  border: 1px solid rgba(222, 216, 207, 0.5);
  padding: 18px 16px;
  box-shadow: var(--shadow-soft);
  transition: all 0.3s ease;
  text-align: center;
}

.summary-card:nth-child(1) { border-radius: 24px 16px 24px 16px; }
.summary-card:nth-child(2) { border-radius: 16px 24px 16px 24px; }
.summary-card:nth-child(3) { border-radius: 24px 24px 16px 16px; }
.summary-card:nth-child(4) { border-radius: 16px 16px 24px 24px; }
.summary-card:nth-child(5) { border-radius: 24px 16px 16px 24px; }
.summary-card:nth-child(6) { border-radius: 16px 24px 24px 16px; }
.summary-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}

.summary-card .card-value {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 22px;
  color: var(--fg);
  line-height: 1.2;
}

.summary-card .card-value.blue {
  color: var(--primary);
}

.summary-card .card-value.red {
  color: var(--destructive);
}

.summary-card .card-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--muted-fg);
  margin-top: 4px;
}

/* Profit Card */
.profit-card {
  background: linear-gradient(135deg, rgba(74, 127, 181, 0.04) 0%, rgba(74, 127, 181, 0.08) 100%);
  border: 1px solid rgba(74, 127, 181, 0.2);
  border-top: 4px solid var(--primary);
  border-radius: 24px 16px 24px 16px;
  padding: 24px 32px;
  box-shadow: var(--shadow-float);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 20px;
  transition: all 0.3s ease;
}

.profit-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}

.profit-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(74, 127, 181, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.profit-icon svg {
  width: 28px;
  height: 28px;
  stroke-width: 2;
  color: var(--primary);
}

.profit-info {
  text-align: center;
}

.profit-value {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 36px;
  color: var(--primary);
  line-height: 1.1;
}

.profit-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--muted-fg);
  margin-top: 4px;
}

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
  padding: 14px 12px;
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
}

.data-table tbody tr {
  height: 48px;
  transition: background 0.3s ease;
}

.data-table tbody tr:hover {
  background: rgba(240, 235, 229, 0.4);
}

.data-table tbody td {
  padding: 0 12px;
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
}

.order-id {
  font-weight: 600;
  color: var(--primary);
  cursor: pointer;
}

.order-id:hover {
  text-decoration: underline;
}

.amount {
  font-weight: 600;
  color: var(--primary);
}

.amount.red {
  color: var(--destructive);
}

/* Total row */
.data-table tfoot td {
  padding: 14px 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--fg);
  background: var(--muted);
  border-top: 2px solid var(--border);
  white-space: nowrap;
}

.data-table tfoot td:first-child {
  padding-left: 24px;
}

.data-table tfoot td:last-child {
  padding-right: 24px;
}

.total-label {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 14px;
  color: var(--fg);
}

.total-amount {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 15px;
  color: var(--primary);
}

/* Empty State */
.empty-cell {
  padding: 60px 24px !important;
  text-align: center;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--muted-fg);
}

.empty-state p {
  font-size: 14px;
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

.page-btn:hover {
  background: rgba(230, 220, 205, 0.4);
}

.page-btn.active {
  background: var(--primary);
  color: white;
  box-shadow: var(--shadow-soft);
}

.page-btn.nav-arrow {
  padding: 0 10px;
}

.page-btn svg {
  width: 16px;
  height: 16px;
  stroke-width: 2;
}

@media (max-width: 1200px) {
  .summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
