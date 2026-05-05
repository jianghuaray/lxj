<template>
  <div class="volunteer-page">
    <div class="page-header">
      <h2 class="page-title">志愿者服务</h2>
      <button class="btn-add" @click="router.push('/volunteers/add')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        新增志愿者
      </button>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon blue">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.totalVolunteers || 0 }}</div>
          <div class="stat-label">志愿者总数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.newThisMonth || 0 }}</div>
          <div class="stat-label">本月新增</div>
          <div v-if="stats.monthlyTrend" class="stat-trend" :class="stats.monthlyTrend >= 0 ? 'up' : 'down'">
            <svg v-if="stats.monthlyTrend >= 0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><polyline points="18 15 12 9 6 15"/></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><polyline points="6 9 12 15 18 9"/></svg>
            {{ Math.abs(stats.monthlyTrend) }}%
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon red">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.partyRatio || '0%' }}</div>
          <div class="stat-label">党员比例</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon amber">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 12-9 12S3 17 3 10a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.communityCount || 0 }}</div>
          <div class="stat-label">覆盖社区数</div>
        </div>
      </div>
    </div>

    <div class="filter-toolbar">
      <el-input v-model="searchQuery" class="filter-input-el" placeholder="搜索姓名/电话" clearable @clear="resetPageAndFetch" @keyup.enter="resetPageAndFetch">
        <template #prefix>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;color:var(--muted-fg)"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </template>
      </el-input>
      <el-select v-model="communityFilter" class="filter-select-el" placeholder="所属社区" clearable @change="fetchVolunteers">
        <el-option v-for="c in communities" :key="c" :label="c" :value="c" />
      </el-select>
      <el-select v-model="politicalStatusFilter" class="filter-select-el" placeholder="政治面貌" clearable @change="fetchVolunteers">
        <el-option label="党员" value="party" />
        <el-option label="团员" value="league" />
        <el-option label="群众" value="mass" />
        <el-option label="其他" value="other" />
      </el-select>
      <el-select v-model="genderFilter" class="filter-select-el" placeholder="性别" clearable @change="fetchVolunteers">
        <el-option label="男" value="male" />
        <el-option label="女" value="female" />
      </el-select>
      <button class="btn-filter primary" @click="fetchVolunteers">查询</button>
      <button class="btn-filter secondary" @click="resetFilters">重置</button>
      <button class="btn-export" style="margin-left:auto;" @click="exportVolunteers">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        导出Excel
      </button>
    </div>

    <div class="volunteer-grid">
      <div v-for="vol in volunteers" :key="vol.id" class="vol-card">
        <div class="vol-card-header">
          <div class="vol-info">
            <div class="vol-name">{{ vol.name }}</div>
            <div class="vol-contact">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              {{ vol.phone }}
            </div>
          </div>
          <div class="vol-badges">
            <span class="political-badge" :class="vol.politicalStatus">{{ getPoliticalStatusLabel(vol.politicalStatus) }}</span>
            <span class="gender-pill" :class="vol.gender">{{ vol.gender === 'male' ? '男' : '女' }}</span>
          </div>
        </div>
        <div class="vol-stats-row">
          <div class="vol-stat-item">
            <div class="vol-stat-value">{{ vol.serviceHours || 0 }}h</div>
            <div class="vol-stat-label">服务时长</div>
          </div>
          <div class="vol-stat-item">
            <div class="vol-stat-value">{{ vol.serviceCount || 0 }}</div>
            <div class="vol-stat-label">服务次数</div>
          </div>
          <div class="vol-stat-item">
            <div class="vol-stat-value sm">{{ vol.community }}</div>
            <div class="vol-stat-label">所属社区</div>
          </div>
        </div>
        <div class="vol-card-footer">
          <button class="vol-action-link primary" @click="router.push(`/volunteers/${vol.id}`)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            查看详情
          </button>
          <button class="vol-action-link muted" @click="router.push(`/volunteers/edit/${vol.id}`)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
            编辑
          </button>
        </div>
      </div>
      <div v-if="!loading && volunteers.length === 0" class="empty-card">
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--muted-fg)" stroke-width="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          <p>暂无志愿者数据</p>
        </div>
      </div>
    </div>

    <div class="pagination-bar" v-if="volunteers.length > 0">
      <div class="pagination-info">
        共 <strong>{{ total }}</strong> 条，每页
        <el-select v-model="pageSize" class="page-size-select" @change="page = 1; fetchVolunteers()">
          <el-option :value="12" label="12" />
          <el-option :value="20" label="20" />
          <el-option :value="50" label="50" />
        </el-select>
        条
      </div>
      <div class="pagination-buttons">
        <button class="page-btn nav-arrow" :disabled="page <= 1" @click="page--; fetchVolunteers()">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <button
          v-for="p in pageButtons"
          :key="p"
          class="page-btn"
          :class="{ active: p === page }"
          :disabled="p === '...'"
          @click="goToPage(p)"
        >{{ p }}</button>
        <button class="page-btn nav-arrow" :disabled="page >= totalPages" @click="page++; fetchVolunteers()">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/utils/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { exportToExcel } from '@/utils/exportExcel'

const router = useRouter()

const loading = ref(false)
const volunteers = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(12)
const searchQuery = ref('')
const communityFilter = ref('')
const politicalStatusFilter = ref('')
const genderFilter = ref('')
const communities = ref([])

const stats = ref({
  totalVolunteers: 0,
  newThisMonth: 0,
  monthlyTrend: 0,
  partyRatio: '0%',
  communityCount: 0
})

const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1)
const pageButtons = computed(() => {
  const total = totalPages.value
  const current = page.value
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

function getPoliticalStatusLabel(status) {
  const map = { mass: '群众', party: '党员', league: '团员', other: '其他' }
  return map[status] || status
}

async function fetchVolunteers() {
  loading.value = true
  try {
    const params = { page: page.value, pageSize: pageSize.value }
    if (searchQuery.value) params.keyword = searchQuery.value
    if (communityFilter.value) params.community = communityFilter.value
    if (politicalStatusFilter.value) params.politicalStatus = politicalStatusFilter.value
    if (genderFilter.value) params.gender = genderFilter.value
    const response = await api.get('/volunteers', { params })
    volunteers.value = response.data.items || response.data || []
    total.value = response.data.total || volunteers.value.length
    const uniqueCommunities = new Set()
    volunteers.value.forEach(v => {
      if (v.community) uniqueCommunities.add(v.community)
    })
    communities.value = [...uniqueCommunities]
  } catch (error) {
    ElMessage.error('获取志愿者列表失败')
  } finally {
    loading.value = false
  }
}

async function fetchStats() {
  try {
    const response = await api.get('/volunteers/stats/overview')
    if (response.data) {
      stats.value = {
        totalVolunteers: response.data.totalVolunteers || 0,
        newThisMonth: response.data.monthNew || 0,
        monthlyTrend: response.data.monthlyTrend || 0,
        partyRatio: (response.data.partyRatio || 0) + '%',
        communityCount: response.data.communityCount || 0
      }
    }
  } catch (e) {
    try {
      const response = await api.get('/volunteers', { params: { pageSize: 9999 } })
      const all = response.data.items || response.data || []
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const newThisMonth = all.filter(v => v.createdAt && new Date(v.createdAt) >= startOfMonth).length
      const partyCount = all.filter(v => v.politicalStatus === 'party').length
      const uniqueCommunities = new Set()
      all.forEach(v => { if (v.community) uniqueCommunities.add(v.community) })
      stats.value = {
        totalVolunteers: all.length,
        newThisMonth,
        monthlyTrend: 0,
        partyRatio: all.length > 0 ? Math.round((partyCount / all.length) * 100) + '%' : '0%',
        communityCount: uniqueCommunities.size
      }
    } catch (e2) {
      // silent
    }
  }
}

function resetFilters() {
  searchQuery.value = ''
  communityFilter.value = ''
  politicalStatusFilter.value = ''
  genderFilter.value = ''
  page.value = 1
  fetchVolunteers()
}

function resetPageAndFetch() {
  page.value = 1
  fetchVolunteers()
}

function goToPage(p) {
  if (p !== '...') {
    page.value = p
    fetchVolunteers()
  }
}

async function handleDelete(vol) {
  try {
    await ElMessageBox.confirm('确定要删除该志愿者吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await api.delete(`/volunteers/${vol.id}`)
    ElMessage.success('删除成功')
    fetchVolunteers()
    fetchStats()
  } catch (error) {
    if (error !== 'cancel') ElMessage.error('删除失败')
  }
}

async function exportVolunteers() {
  try {
    const params = { page: 1, pageSize: 9999 }
    if (searchQuery.value) params.keyword = searchQuery.value
    if (communityFilter.value) params.community = communityFilter.value
    if (politicalStatusFilter.value) params.politicalStatus = politicalStatusFilter.value
    if (genderFilter.value) params.gender = genderFilter.value
    const response = await api.get('/volunteers', { params })
    const allVolunteers = response.data.items || response.data || []
    const headers = ['姓名', '联系方式', '年龄', '性别', '政治面貌', '所属社区', '家庭住址', '个人特长', '服务意向']
    const data = allVolunteers.map(v => [
      v.name || '',
      v.phone || '',
      v.age || '',
      v.gender === 'male' ? '男' : '女',
      getPoliticalStatusLabel(v.politicalStatus),
      v.community || '',
      v.address || '',
      v.specialty || '',
      v.serviceIntention || ''
    ])
    exportToExcel('志愿者列表', headers, data)
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error('导出失败')
  }
}

onMounted(() => {
  fetchVolunteers()
  fetchStats()
})
</script>

<style scoped lang="scss">
.volunteer-page {
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
  transition: all 0.3s ease;

  &:nth-child(1) { border-radius: 24px 16px 24px 16px; }
  &:nth-child(2) { border-radius: 16px 24px 16px 24px; }
  &:nth-child(3) { border-radius: 24px 24px 16px 16px; }
  &:nth-child(4) { border-radius: 16px 16px 24px 24px; }

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
  &.green { background: rgba(76, 175, 80, 0.1); color: #4caf50; }
  &.red { background: rgba(212, 114, 106, 0.1); color: #D4726A; }
  &.amber { background: rgba(232, 184, 75, 0.15); color: var(--secondary); }
}

.stat-card:hover .stat-icon.blue { background: var(--primary); color: white; }
.stat-card:hover .stat-icon.green { background: #4caf50; color: white; }
.stat-card:hover .stat-icon.red { background: #D4726A; color: white; }
.stat-card:hover .stat-icon.amber { background: var(--secondary); color: white; }

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

.stat-trend {
  font-size: 11px;
  font-weight: 600;
  margin-top: 4px;
  display: inline-flex;
  align-items: center;
  gap: 2px;

  &.up { color: var(--primary); }
  &.down { color: var(--destructive); }
}

.filter-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  background: rgba(240, 235, 229, 0.5);
  border-radius: 24px;
  padding: 14px 20px;
}

.filter-input-el {
  flex: 1;
  min-width: 200px;
  :deep(.el-input__wrapper) {
    border-radius: 999px !important;
    min-height: 40px !important;
    height: 40px !important;
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
  width: 160px !important;
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
    box-shadow: 0 4px 20px -2px rgba(74, 127, 181, 0.15);

    &:hover {
      background: #3d6fa0;
      border-color: #3d6fa0;
      box-shadow: 0 4px 20px -2px rgba(74, 127, 181, 0.3);
    }
  }

  &.secondary {
    background: transparent;
    border-color: var(--secondary);
    color: var(--secondary);
    box-shadow: none !important;

    &:hover { background: rgba(232, 184, 75, 0.08); }
  }
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

  &:hover {
    background: rgba(232, 184, 75, 0.08);
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
}

.volunteer-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.vol-card {
  background: var(--card-bg);
  border: 1px solid rgba(222, 216, 207, 0.5);
  padding: 24px;
  box-shadow: var(--shadow-soft);
  transition: all 0.3s ease;
  cursor: pointer;

  &:nth-child(odd) { border-radius: 24px 16px 24px 16px; }
  &:nth-child(even) { border-radius: 16px 24px 16px 24px; }

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-hover);
  }
}

.vol-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.vol-info {
  flex: 1;
}

.vol-name {
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 18px;
  color: var(--fg);
  margin-bottom: 4px;
}

.vol-contact {
  font-size: 13px;
  font-weight: 400;
  color: #9A9A8E;
  display: flex;
  align-items: center;
  gap: 6px;

  svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }
}

.vol-badges {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.gender-pill {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;

  &.male {
    background: rgba(74, 127, 181, 0.1);
    color: #4A7FB5;
  }

  &.female {
    background: rgba(212, 114, 106, 0.1);
    color: #D4726A;
  }
}

.political-badge {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;

  &.party {
    background: rgba(212, 114, 106, 0.1);
    color: #D4726A;
  }

  &.league {
    background: rgba(74, 127, 181, 0.12);
    color: #4A7FB5;
  }

  &.mass {
    background: rgba(120, 120, 108, 0.1);
    color: #78786C;
  }

  &.other {
    background: rgba(230, 220, 205, 0.4);
    color: #4A4A40;
  }
}

.vol-stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 18px 0;
  border-top: 1px solid rgba(222, 216, 207, 0.4);
  border-bottom: 1px solid rgba(222, 216, 207, 0.4);
  margin-bottom: 18px;
}

.vol-stat-item {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.vol-stat-value {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 18px;
  color: #5A5A50;
  line-height: 1.2;
  min-height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.vol-stat-label {
  font-size: 11px;
  font-weight: 500;
  color: #9A9A8E;
  margin-top: 2px;
}

.vol-card-footer {
  display: flex;
  align-items: center;
  gap: 16px;
}

.vol-action-link {
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

  svg {
    width: 14px;
    height: 14px;
  }

  &.primary {
    color: var(--primary);
    &:hover { color: #3D6A9A; }
  }

  &.muted {
    color: var(--muted-fg);
    &:hover { color: var(--fg); }
  }
}

.vol-stat-value.sm {
  font-size: 14px;
  font-family: var(--font-body);
  font-weight: 600;
}

.empty-card {
  grid-column: 1 / -1;
  background: var(--card-bg);
  border: 1px solid rgba(222, 216, 207, 0.5);
  border-radius: 24px;
  padding: 48px 24px;
}

@media (max-width: 1200px) {
  .volunteer-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 768px) {
  .volunteer-grid { grid-template-columns: 1fr; }
}
</style>
