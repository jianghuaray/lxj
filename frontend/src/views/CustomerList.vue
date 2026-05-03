<template>
  <div class="customer-list-page">
    <div class="page-header">
      <h1 class="page-title">客户管理</h1>
      <button class="btn-new-order" @click="showDialog()">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        添加客户
      </button>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">客户总数</div>
          <div class="stat-trend up">+8.3% 较上月</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.vip }}</div>
          <div class="stat-label">VIP客户</div>
          <div class="stat-trend up">+5.4% 较上月</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.newThisMonth }}</div>
          <div class="stat-label">本月新增</div>
          <div class="stat-trend up">+15.2% 较上月</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.blacklist }}</div>
          <div class="stat-label">黑名单客户</div>
          <div class="stat-trend down">-2 较上月</div>
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
      <el-select v-model="levelFilter" class="filter-select-el" placeholder="全部等级" clearable @change="fetchCustomers">
        <el-option label="普通客户" value="normal" />
        <el-option label="VIP客户" value="vip" />
        <el-option label="黑名单" value="blacklist" />
      </el-select>
      <el-select v-model="areaFilter" class="filter-select-el" placeholder="全部区域" clearable @change="fetchCustomers">
        <el-option v-for="area in areas" :key="area" :label="area" :value="area" />
      </el-select>
      <button class="btn-query" @click="fetchCustomers">查询</button>
      <button class="btn-reset" @click="resetFilters">重置</button>
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
            <th style="width:8%">客户等级</th>
            <th style="width:14%">标签</th>
            <th style="width:7%">累计工单</th>
            <th style="width:8%">累计消费</th>
            <th style="width:9%">最近报修</th>
            <th style="width:14%">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="customer in customers" :key="customer.id" @click="viewDetail(customer.id)" style="cursor:pointer;">
            <td>{{ customer.name }}</td>
            <td>{{ customer.phone }}</td>
            <td>{{ customer.area }}</td>
            <td :title="customer.address">{{ customer.address || '-' }}</td>
            <td>
              <span class="level-badge" :class="customer.level">{{ getLevelText(customer.level) }}</span>
            </td>
            <td>
              <div class="tags-cell">
                <span v-for="(tag, i) in (customer.tags || []).slice(0, 3)" :key="tag" :class="['tag-badge', getTagClass(i)]">{{ tag }}</span>
                <span v-if="(customer.tags || []).length > 3" class="tag-badge tag-weekend">+{{ customer.tags.length - 3 }}</span>
              </div>
            </td>
            <td>{{ customer.totalOrders || 0 }}</td>
            <td>¥{{ customer.totalAmount || 0 }}</td>
            <td>{{ formatDate(customer.lastOrderAt) }}</td>
            <td>
              <button class="action-btn" @click.stop="viewDetail(customer.id)">查看</button>
              <button class="action-btn" @click.stop="showDialog(customer)">编辑</button>
            </td>
          </tr>
          <tr v-if="!loading && customers.length === 0">
            <td colspan="10" class="empty-cell">
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

    <!-- Add/Edit Dialog -->
    <el-dialog v-model="dialogVisible" :title="editingCustomer ? '编辑客户' : '新增客户'" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="电话" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入电话" />
        </el-form-item>
        <el-form-item label="区域">
          <el-select v-model="form.area" placeholder="请选择区域" clearable style="width:100%">
            <el-option v-for="area in areas" :key="area" :label="area" :value="area" />
          </el-select>
        </el-form-item>
        <el-form-item label="详细地址">
          <el-input v-model="form.address" placeholder="请输入地址" />
        </el-form-item>
        <el-form-item label="客户等级">
          <el-select v-model="form.level" style="width:100%">
            <el-option label="普通客户" value="normal" />
            <el-option label="VIP客户" value="vip" />
            <el-option label="黑名单" value="blacklist" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注/偏好">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="备注信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitLoading">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/utils/api'
import { ElMessage } from 'element-plus'
import { debounce } from '@/utils/debounce'
import { formatDate } from '@/utils/format'

const router = useRouter()
const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const editingCustomer = ref(null)
const formRef = ref(null)

const customers = ref([])
const searchQuery = ref('')
const levelFilter = ref('')
const areaFilter = ref('')
const pagination = ref({ page: 1, pageSize: 12, total: 0 })

const stats = ref({ total: 0, vip: 0, newThisMonth: 0, blacklist: 0 })
const areas = ['新城区', '未央区', '高新区', '灞桥区']

const form = ref({ name: '', phone: '', area: '', address: '', level: 'normal', remark: '' })
const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入电话', trigger: 'blur' }]
}

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

function getLevelText(level) {
  const map = { normal: '普通', vip: 'VIP', blacklist: '黑名单' }
  return map[level] || '普通'
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
    pagination.page = p
    fetchCustomers()
  }
}

function showDialog(customer = null) {
  editingCustomer.value = customer
  if (customer) {
    form.value = { ...customer }
  } else {
    form.value = { name: '', phone: '', area: '', address: '', level: 'normal', remark: '' }
  }
  dialogVisible.value = true
}

async function submitForm() {
  try { await formRef.value.validate() } catch(e) { return }
  submitLoading.value = true
  try {
    if (editingCustomer.value) {
      await api.patch(`/customers/${editingCustomer.value.id}`, form.value)
      ElMessage.success('更新成功')
    } else {
      await api.post('/customers', form.value)
      ElMessage.success('添加成功')
    }
    dialogVisible.value = false
    await fetchCustomers()
  } catch (error) {
    ElMessage.error('操作失败')
  } finally {
    submitLoading.value = false
  }
}

function resetFilters() {
  searchQuery.value = ''
  levelFilter.value = ''
  areaFilter.value = ''
  pagination.value.page = 1
  fetchCustomers()
}

async function fetchCustomers() {
  loading.value = true
  try {
    const params = { page: pagination.value.page, pageSize: pagination.value.pageSize }
    if (searchQuery.value) params.keyword = searchQuery.value
    if (levelFilter.value) params.level = levelFilter.value
    if (areaFilter.value) params.area = areaFilter.value
    const response = await api.get('/customers', { params })
    customers.value = response.data.items || response.data || []
    pagination.value.total = response.data.total || customers.value.length

    // 计算统计
    stats.value.total = pagination.value.total
    stats.value.vip = customers.value.filter(c => c.level === 'vip').length
    stats.value.blacklist = customers.value.filter(c => c.level === 'blacklist').length
    stats.value.newThisMonth = Math.floor(Math.random() * 50 + 50) // 模拟数据
  } catch (error) {
    ElMessage.error('获取客户列表失败')
  } finally {
    loading.value = false
  }
}

// Debounced search - wait 300ms after user stops typing
const debouncedSearch = debounce(() => {
  pagination.page = 1
  fetchCustomers()
}, 300)

onMounted(() => { fetchCustomers() })
onUnmounted(() => { debouncedSearch.cancel() })
</script>

<style scoped lang="scss">
.customer-list-page { position: relative; z-index: 1; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.page-title { font-family: var(--font-display); font-weight: 700; font-size: 24px; color: var(--fg); margin: 0; }
.btn-new-order { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 36px; padding: 0 20px; border-radius: 999px; border: 1.5px solid var(--primary); background: var(--primary); color: white; font-family: var(--font-body); font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: var(--shadow-soft); transition: all 0.2s ease; }
.btn-new-order:hover { background: #3D6FA0; border-color: #3D6FA0; box-shadow: var(--shadow-soft); }
.btn-new-order svg { width: 18px; height: 18px; stroke-width: 2; }

/* Stats Cards */
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
.stat-card { background: var(--card-bg); border: 1px solid rgba(222,216,207,0.5); padding: 20px; display: flex; align-items: center; gap: 16px; box-shadow: var(--shadow-soft); cursor: pointer; transition: all 0.3s ease; }
.stat-card:nth-child(1) { border-radius: 24px 16px 24px 16px; }
.stat-card:nth-child(2) { border-radius: 16px 24px 16px 24px; }
.stat-card:nth-child(3) { border-radius: 24px 24px 16px 16px; }
.stat-card:nth-child(4) { border-radius: 16px 16px 24px 24px; }
.stat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-hover); }
.stat-icon { width: 48px; height: 48px; border-radius: 50%; background: rgba(74,127,181,0.1); display: flex; align-items: center; justify-content: center; color: var(--primary); transition: all 0.3s ease; flex-shrink: 0; }
.stat-card:hover .stat-icon { background: var(--primary); color: white; }
.stat-card:nth-child(2) .stat-icon { background: rgba(232,184,75,0.15); color: var(--secondary); }
.stat-card:nth-child(2):hover .stat-icon { background: var(--secondary); color: white; }
.stat-card:nth-child(4) .stat-icon { background: rgba(212,114,106,0.1); color: var(--destructive); }
.stat-card:nth-child(4):hover .stat-icon { background: var(--destructive); color: white; }
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

/* Customer level badges */
.level-badge { display: inline-flex; align-items: center; height: 26px; padding: 0 14px; border-radius: 999px; font-size: 12px; font-weight: 600; white-space: nowrap; }
.level-badge.normal { background: rgba(120,120,108,0.1); color: #78786C; }
.level-badge.vip { background: rgba(232,184,75,0.15); color: #B8922E; }
.level-badge.blacklist { background: rgba(212,114,106,0.1); color: #D4726A; }

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
