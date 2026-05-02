<template>
  <div class="technician-page">
    <!-- Page Header -->
    <div class="page-header">
      <h2 class="page-title">师傅管理</h2>
      <button class="btn-add" @click="$router.push('/technicians/add')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        添加师傅
      </button>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon blue">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.activeCount || 0 }}</div>
          <div class="stat-label">在岗师傅</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.monthOrders || 0 }}</div>
          <div class="stat-label">本月总单量</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon yellow">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.avgSatisfaction || '-' }}</div>
          <div class="stat-label">平均满意度</div>
        </div>
      </div>
    </div>

    <!-- Filter Toolbar -->
    <div class="filter-toolbar">
      <el-select v-model="specialtyFilter" class="filter-select-el" placeholder="全部类型" clearable @change="fetchTechnicians">
        <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
      </el-select>
      <el-select v-model="statusFilter" class="filter-select-el" placeholder="全部状态" clearable @change="fetchTechnicians">
        <el-option label="启用" value="1" />
        <el-option label="停用" value="0" />
      </el-select>
      <div class="search-wrapper">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <input type="text" class="filter-search" v-model="searchQuery" placeholder="按姓名/电话搜索" @keyup.enter="fetchTechnicians" />
      </div>
      <button class="btn-filter primary" @click="fetchTechnicians">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        查询
      </button>
      <button class="btn-filter secondary" @click="resetFilters">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        重置
      </button>
    </div>

    <!-- Technician Card Grid -->
    <div class="technician-grid" v-if="technicians.length > 0">
      <div
        v-for="(tech, index) in technicians"
        :key="tech.id"
        class="tech-card"
        :class="{ 'odd': index % 2 === 0, 'even': index % 2 !== 0 }"
      >
        <div class="tech-card-header">
          <div class="tech-avatar">{{ tech.name?.charAt(0) || '?' }}</div>
          <span class="status-pill" :class="tech.status === 1 ? 'active' : 'disabled'">
            <span class="status-dot" :class="tech.status === 1 ? 'active' : 'disabled'"></span>
            {{ tech.status === 1 ? '启用' : '停用' }}
          </span>
        </div>
        <div class="tech-name">{{ tech.name }}</div>
        <div class="tech-contact">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          {{ tech.phone }}
        </div>
        <div class="tech-skills">
          <span v-for="s in (tech.specialties || [])" :key="s" class="skill-tag">{{ s }}</span>
        </div>
        <div class="tech-stats-row">
          <div class="tech-stat-item">
            <div class="tech-stat-value">{{ tech.orderCount || 0 }}</div>
            <div class="tech-stat-label">本月单量</div>
          </div>
          <div class="tech-stat-item">
            <div class="tech-stat-value">{{ tech.avgSatisfaction || '-' }}</div>
            <div class="tech-stat-label">满意度</div>
          </div>
          <div class="tech-stat-item">
            <div class="tech-stat-value">{{ formatRevenue(tech) }}</div>
            <div class="tech-stat-label">营收</div>
          </div>
        </div>
        <div class="tech-card-actions">
          <button class="action-link primary" @click="$router.push(`/technicians/add?id=${tech.id}`)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            查看详情
          </button>
          <button class="action-link muted" @click="showSettlement(tech)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            结算
          </button>
          <button class="action-link muted" @click="$router.push(`/technicians/add?id=${tech.id}`)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
            编辑
          </button>
          <button class="action-link danger" @click="handleDelete(tech)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            删除
          </button>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--muted-fg)" stroke-width="1.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
      <p>暂无师傅数据</p>
    </div>

    <!-- Pagination -->
    <div class="pagination-bar" v-if="technicians.length > 0">
      <div class="pagination-info">
        共 <strong>{{ total }}</strong> 位师傅，每页
        <el-select v-model="pageSize" class="page-size-select" @change="fetchTechnicians">
          <el-option :value="12" label="12" />
          <el-option :value="20" label="20" />
          <el-option :value="50" label="50" />
        </el-select>
        条
      </div>
      <div class="pagination-buttons">
        <button class="page-btn nav-arrow" :disabled="page <= 1" @click="page--; fetchTechnicians()">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <button
          v-for="p in pageButtons"
          :key="p"
          class="page-btn"
          :class="{ active: p === page }"
          @click="page = p; fetchTechnicians()"
        >{{ p }}</button>
        <button class="page-btn nav-arrow" :disabled="page >= totalPages" @click="page++; fetchTechnicians()">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>

    <!-- Settlement Dialog -->
    <el-dialog v-model="showSettlementDialog" title="师傅对账结算" width="700px" :border-radius="'24px'">
      <div class="settlement-header">
        <span class="settlement-name">{{ settlementTech.name }} - 月度结算</span>
        <el-select v-model="settlementMonth" class="filter-select-el" @change="fetchSettlement">
          <el-option v-for="m in recentMonths" :key="m.value" :label="m.label" :value="m.value" />
        </el-select>
      </div>
      <div class="settlement-summary">
        <div class="summary-item">
          <span class="summary-label">当月工单</span>
          <span class="summary-value">{{ settlementData.orderCount || 0 }} 单</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">合计总费用</span>
          <span class="summary-value">¥{{ settlementData.totalFee || 0 }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">合计服务费</span>
          <span class="summary-value">¥{{ settlementData.serviceFee || 0 }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">合计材料成本</span>
          <span class="summary-value">¥{{ settlementData.materialCost || 0 }}</span>
        </div>
        <div class="summary-item highlight">
          <span class="summary-label">应付师傅</span>
          <span class="summary-value">¥{{ settlementData.technicianFee || 0 }}</span>
        </div>
      </div>
      <template #footer>
        <el-button @click="showSettlementDialog = false">关闭</el-button>
        <el-button type="primary" @click="exportSettlement">导出结算单</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/utils/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const technicians = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(12)
const searchQuery = ref('')
const statusFilter = ref('')
const specialtyFilter = ref('')
const categories = ['水电维修', '下水疏通', '家具门窗', '家电维修', '家电清洗', '测漏防水', '开锁换锁', '局部翻新']

const stats = ref({
  activeCount: 0,
  monthOrders: 0,
  avgSatisfaction: '-'
})

const showSettlementDialog = ref(false)
const settlementTech = ref({})
const settlementMonth = ref('')
const settlementData = ref({})

const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1)
const pageButtons = computed(() => {
  const pages = []
  const start = Math.max(1, page.value - 2)
  const end = Math.min(totalPages.value, page.value + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

const recentMonths = (() => {
  const months = []
  const now = new Date()
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `${d.getFullYear()}年${d.getMonth() + 1}月`
    months.push({ value, label })
  }
  return months
})()

settlementMonth.value = recentMonths[0]?.value || ''

function formatRevenue(tech) {
  if (tech.totalRevenue) return `¥${Number(tech.totalRevenue).toLocaleString()}`
  return '¥0'
}

function resetFilters() {
  searchQuery.value = ''
  statusFilter.value = ''
  specialtyFilter.value = ''
  page.value = 1
  fetchTechnicians()
}

async function fetchStats() {
  try {
    const response = await api.get('/technicians', { params: { pageSize: 999 } })
    const all = response.data.items || response.data || []
    stats.value.activeCount = all.filter(t => t.status === 1).length
    stats.value.monthOrders = all.reduce((sum, t) => sum + (t.orderCount || 0), 0)
    const rated = all.filter(t => t.avgSatisfaction && t.avgSatisfaction !== '-')
    if (rated.length > 0) {
      const avg = rated.reduce((sum, t) => sum + parseFloat(t.avgSatisfaction), 0) / rated.length
      stats.value.avgSatisfaction = avg.toFixed(1)
    }
  } catch (e) {
    // silent
  }
}

async function fetchTechnicians() {
  loading.value = true
  try {
    const params = { page: page.value, pageSize: pageSize.value }
    if (searchQuery.value) params.keyword = searchQuery.value
    if (statusFilter.value !== '') params.status = statusFilter.value
    if (specialtyFilter.value) params.specialty = specialtyFilter.value
    const response = await api.get('/technicians', { params })
    technicians.value = response.data.items || response.data || []
    total.value = response.data.total || technicians.value.length
  } catch (error) {
    ElMessage.error('获取师傅列表失败')
  } finally {
    loading.value = false
  }
}

function showSettlement(tech) {
  settlementTech.value = tech
  showSettlementDialog.value = true
  fetchSettlement()
}

async function fetchSettlement() {
  try {
    const response = await api.get(`/technicians/${settlementTech.value.id}/settlement`, {
      params: { month: settlementMonth.value }
    })
    settlementData.value = response.data
  } catch (error) {
    settlementData.value = {}
  }
}

async function exportSettlement() {
  try {
    const response = await api.get(`/technicians/${settlementTech.value.id}/settlement/export`, {
      params: { month: settlementMonth.value },
      responseType: 'blob'
    })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.download = `结算单_${settlementTech.value.name}_${settlementMonth.value}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error('导出失败')
  }
}

async function handleDelete(tech) {
  try {
    await ElMessageBox.confirm('确定要删除该师傅吗？', '提示', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
    })
    await api.delete(`/technicians/${tech.id}`)
    ElMessage.success('删除成功')
    await fetchTechnicians()
    await fetchStats()
  } catch (error) {
    if (error !== 'cancel') ElMessage.error('删除失败')
  }
}

onMounted(() => {
  fetchTechnicians()
  fetchStats()
})
</script>

<style scoped lang="scss">
.technician-page {
  position: relative;
  z-index: 1;
}

/* Page Header */
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

.btn-add {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 24px;
  border-radius: 999px;
  border: none;
  background: var(--primary);
  color: white;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--shadow-soft);
  transition: all 0.3s ease;

  svg {
    width: 18px;
    height: 18px;
    stroke-width: 2;
  }

  &:hover {
    transform: scale(1.05);
    box-shadow: var(--shadow-hover);
  }

  &:active {
    transform: scale(0.95);
  }
}

/* Stats Cards */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
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

  &:nth-child(1) { border-radius: 24px 16px 24px 16px; }
  &:nth-child(2) { border-radius: 16px 24px 16px 24px; }
  &:nth-child(3) { border-radius: 24px 24px 16px 16px; }

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-hover);
  }
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  flex-shrink: 0;

  svg {
    width: 22px;
    height: 22px;
    stroke-width: 2;
  }

  &.blue { background: rgba(74, 127, 181, 0.1); color: var(--primary); }
  &.green { background: rgba(76, 175, 80, 0.1); color: #4CAF50; }
  &.yellow { background: rgba(232, 184, 75, 0.15); color: #C99A2E; }
}

.stat-card:hover .stat-icon.blue { background: var(--primary); color: white; }
.stat-card:hover .stat-icon.green { background: #4CAF50; color: white; }
.stat-card:hover .stat-icon.yellow { background: #C99A2E; color: white; }

.stat-info { flex: 1; }

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

/* Filter Toolbar */
.filter-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-select {
  height: 40px;
  padding: 0 36px 0 16px;
  border-radius: 999px;
  border: 1px solid rgba(222,216,207,0.8);
  background: rgba(255,255,255,0.5);
  color: var(--fg);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%2378786C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  transition: all 0.2s ease;

  &:hover { border-color: var(--primary); }
  &:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(74, 127, 181, 0.15); }
}

.filter-search {
  height: 40px;
  padding: 0 16px 0 38px;
  border-radius: 999px;
  border: 1px solid rgba(222,216,207,0.8);
  background: rgba(255,255,255,0.5);
  color: var(--fg);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 500;
  outline: none;
  width: 220px;
  transition: all 0.2s ease;

  &::placeholder { color: var(--muted-fg); }
  &:hover { border-color: var(--primary); }
  &:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(74, 127, 181, 0.15); }
}

.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;

  svg {
    position: absolute;
    left: 12px;
    width: 16px;
    height: 16px;
    color: var(--muted-fg);
    pointer-events: none;
  }
}

.btn-filter {
  height: 36px;
  padding: 0 20px;
  border-radius: 999px;
  border: 1.5px solid transparent;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &.primary {
    background: var(--primary);
    border-color: var(--primary);
    color: white;
    box-shadow: var(--shadow-soft);

    &:hover {
      background: #3D6FA0;
      border-color: #3D6FA0;
      box-shadow: var(--shadow-soft);
    }
  }

  &.secondary {
    background: transparent;
    border-color: var(--secondary);
    color: var(--secondary);

    &:hover { background: rgba(232,184,75,0.08); }
  }
}

/* Technician Card Grid */
.technician-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.tech-card {
  background: var(--card-bg);
  border: 1px solid rgba(222, 216, 207, 0.5);
  padding: 24px;
  box-shadow: var(--shadow-soft);
  transition: all 0.3s ease;

  &.odd { border-radius: 24px 16px 24px 16px; }
  &.even { border-radius: 16px 24px 16px 24px; }

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-hover);
  }
}

.tech-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.tech-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(74, 127, 181, 0.15), rgba(74, 127, 181, 0.25));
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 22px;
  color: var(--primary);
  flex-shrink: 0;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  font-family: var(--font-body);

  &.active { background: rgba(76, 175, 80, 0.1); color: #388E3C; }
  &.disabled { background: rgba(212, 114, 106, 0.1); color: var(--destructive); }
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;

  &.active { background: #4CAF50; }
  &.disabled { background: var(--destructive); }
}

.tech-name {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 18px;
  color: var(--fg);
  margin-bottom: 4px;
}

.tech-contact {
  font-size: 13px;
  font-weight: 400;
  color: var(--muted-fg);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;

  svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }
}

.tech-skills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
}

.skill-tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  font-family: var(--font-body);
  background: rgba(74, 127, 181, 0.08);
  color: var(--primary);
  border: 1px solid rgba(74, 127, 181, 0.15);
}

.tech-stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 14px 0;
  border-top: 1px solid rgba(222, 216, 207, 0.4);
  border-bottom: 1px solid rgba(222, 216, 207, 0.4);
  margin-bottom: 14px;
}

.tech-stat-item {
  text-align: center;
}

.tech-stat-value {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 18px;
  color: var(--fg);
  line-height: 1.2;
}

.tech-stat-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--muted-fg);
  margin-top: 2px;
}

.tech-card-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.action-link {
  font-size: 13px;
  font-weight: 600;
  font-family: var(--font-body);
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: none;
  padding: 0;

  svg { width: 14px; height: 14px; }

  &.primary { color: var(--primary); &:hover { color: #3D6A9A; } }
  &.muted { color: var(--muted-fg); &:hover { color: var(--fg); } }
  &.danger { color: var(--destructive); &:hover { color: #B85A52; } }
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

  select {
    border: none;
    background: transparent;
    font-family: var(--font-body);
    font-size: 13px;
    color: var(--muted-fg);
    cursor: pointer;
    outline: none;
  }
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

  &:hover:not(:disabled) { background: rgba(230, 220, 205, 0.4); }
  &.active { background: var(--primary); color: white; box-shadow: var(--shadow-soft); }
  &:disabled { opacity: 0.3; cursor: not-allowed; }

  &.nav-arrow { padding: 0 10px; }
  svg { width: 16px; height: 16px; stroke-width: 2; }
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 64px 0;
  color: var(--muted-fg);
  font-size: 14px;
}

/* Settlement Dialog */
.settlement-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.settlement-name {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 18px;
  color: var(--fg);
}

.settlement-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 16px;
  border-radius: 12px;
  background: rgba(240, 235, 229, 0.3);

  &.highlight {
    background: rgba(74, 127, 181, 0.08);
    border: 1px solid rgba(74, 127, 181, 0.2);
  }
}

.summary-label { font-size: 14px; color: var(--fg); }
.summary-value { font-family: var(--font-display); font-weight: 700; font-size: 16px; color: var(--primary); }

@media (max-width: 900px) {
  .stats-grid { grid-template-columns: 1fr; }
  .technician-grid { grid-template-columns: 1fr; }
}
</style>
