<template>
  <div class="volunteer-detail-page">
    <div class="page-header">
      <button class="btn-back" @click="goBack">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        返回
      </button>
      <h2 class="page-title">志愿者档案 - {{ volunteer?.name || '' }}</h2>
      <div class="header-actions">
        <button class="btn-edit" @click="openEditModal">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
          编辑信息
        </button>
        <button class="btn-delete" @click="handleDeleteVolunteer">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v6"/></svg>
          删除
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-wrapper">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="loading-spinner">
        <circle cx="12" cy="12" r="10" stroke-dasharray="60" stroke-dashoffset="60"/>
      </svg>
      <p>加载中...</p>
    </div>

    <div v-else-if="!volunteer" class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--muted-fg)" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="10" r="3"/>
        <path d="M7 20c.2-2 2-4 5-4s4.8 2 5 4"/>
      </svg>
      <p>志愿者不存在</p>
    </div>

    <template v-else>
      <div class="overview-card">
        <div class="overview-left">
          <div class="volunteer-avatar">{{ volunteer.name?.charAt(0) || '?' }}</div>
          <div class="overview-info">
            <h3 class="overview-name">{{ volunteer.name }}</h3>
            <p class="overview-phone">{{ volunteer.phone }}</p>
            <div class="overview-badges">
              <span class="badge badge-blue">{{ volunteer.gender === 'male' ? '男' : '女' }}</span>
              <span class="badge badge-red">{{ getPoliticalStatusLabel(volunteer.politicalStatus) }}</span>
              <span class="badge badge-yellow">{{ volunteer.community }}</span>
            </div>
          </div>
        </div>
        <div class="overview-stats">
          <div class="overview-stat">
            <div class="overview-stat-value">{{ volunteer.age || '-' }}</div>
            <div class="overview-stat-label">年龄</div>
          </div>
          <div class="stat-divider"></div>
          <div class="overview-stat">
            <div class="overview-stat-value">{{ formatDateShort(volunteer.createdAt) }}</div>
            <div class="overview-stat-label">登记时间</div>
          </div>
          <div class="stat-divider"></div>
          <div class="overview-stat">
            <div class="overview-stat-value">{{ services.length }}</div>
            <div class="overview-stat-label">服务次数</div>
          </div>
        </div>
      </div>

      <div class="two-col-layout">
        <div class="col-left">
          <div class="card basic-info-card">
            <div class="card-header">
              <h3 class="card-title">基本信息</h3>
            </div>
            <div class="info-fields">
              <div class="info-field">
                <span class="field-label">年龄</span>
                <span class="field-value">{{ volunteer.age || '-' }}岁</span>
              </div>
              <div class="info-field">
                <span class="field-label">性别</span>
                <span class="field-value">{{ volunteer.gender === 'male' ? '男' : '女' }}</span>
              </div>
              <div class="info-field">
                <span class="field-label">政治面貌</span>
                <span class="field-value">{{ getPoliticalStatusLabel(volunteer.politicalStatus) }}</span>
              </div>
              <div class="info-field">
                <span class="field-label">所属社区</span>
                <span class="field-value">{{ volunteer.community || '-' }}</span>
              </div>
              <div class="info-field">
                <span class="field-label">家庭住址</span>
                <span class="field-value">{{ volunteer.address || '-' }}</span>
              </div>
              <div class="info-field">
                <span class="field-label">个人特长</span>
                <span class="field-value">{{ volunteer.specialty || '-' }}</span>
              </div>
              <div class="info-field">
                <span class="field-label">服务意向</span>
                <span class="field-value">{{ volunteer.serviceIntention || '-' }}</span>
              </div>
              <div class="info-field">
                <span class="field-label">登记时间</span>
                <span class="field-value">{{ formatDate(volunteer.createdAt) }}</span>
              </div>
              <div class="info-field field-remark">
                <span class="field-label">备注</span>
                <span class="field-value remark-content">{{ volunteer.remark || '暂无备注' }}</span>
              </div>
            </div>
          </div>

          <div class="card service-records-card">
            <div class="card-header">
              <h3 class="card-title">服务记录</h3>
              <button class="btn-add-service" @click="showAddServiceModal">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                添加
              </button>
            </div>

            <div v-if="services.length === 0" class="empty-state-sm">
              <p>暂无服务记录</p>
            </div>

            <el-table v-else :data="services" class="service-table" stripe>
              <el-table-column label="日期" prop="serviceDate" width="120">
                <template #default="{ row }">{{ formatDateShort(row.serviceDate) }}</template>
              </el-table-column>
              <el-table-column label="内容" prop="serviceContent" min-width="160" />
              <el-table-column label="社区" width="120">
                <template #default="{ row }">
                  <span class="badge badge-yellow table-badge">{{ row.serviceCommunity }}</span>
                </template>
              </el-table-column>
              <el-table-column label="时长" prop="serviceDuration" width="100" />
              <el-table-column label="备注" prop="remark" min-width="120">
                <template #default="{ row }">{{ row.remark || '-' }}</template>
              </el-table-column>
              <el-table-column label="操作" width="100" fixed="right">
                <template #default="{ row }">
                  <div class="table-actions">
                    <button class="action-btn edit" @click="showEditServiceModal(row)">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                    </button>
                    <button class="action-btn delete" @click="handleDeleteService(row)">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v6"/></svg>
                    </button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>

        <div class="col-right">
          <div class="card community-dist-card">
            <div class="card-header">
              <h3 class="card-title">社区分布</h3>
            </div>
            <div v-if="communityDistribution.length === 0" class="empty-state-sm">
              <p>暂无数据</p>
            </div>
            <div v-else class="dist-list">
              <div v-for="item in communityDistribution" :key="item.community" class="dist-item">
                <div class="dist-label">
                  <span class="dist-name">{{ item.community }}</span>
                  <span class="dist-count">{{ item.count }}次</span>
                </div>
                <div class="dist-bar-bg">
                  <div class="dist-bar-fill" :style="{ width: item.percent + '%' }"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="card service-eval-card">
            <div class="card-header">
              <h3 class="card-title">服务评价</h3>
            </div>
            <div class="eval-score">
              <span class="eval-number">{{ evalScore }}</span>
              <div class="eval-stars">
                <svg v-for="i in 5" :key="i" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" :fill="i <= Math.round(evalScore) ? 'var(--secondary)' : 'none'" :stroke="i <= Math.round(evalScore) ? 'var(--secondary)' : 'var(--muted-fg)'" stroke-width="1.5" class="star-icon"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </div>
            </div>
            <div class="eval-stats">
              <div class="eval-stat-row">
                <span class="eval-stat-label">总时长</span>
                <span class="eval-stat-value">{{ totalDurationText }}</span>
              </div>
              <div class="eval-stat-row">
                <span class="eval-stat-label">好评率</span>
                <span class="eval-stat-value">100%</span>
              </div>
              <div class="eval-stat-row">
                <span class="eval-stat-label">最近服务</span>
                <span class="eval-stat-value">{{ latestServiceDate || '暂无' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <el-dialog v-model="showEditModal" title="编辑志愿者信息" width="640px" :border-radius="'24px'">
      <el-form :model="editForm" label-width="100px" :rules="editRules" ref="editFormRef">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="editForm.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="电话" prop="phone">
          <el-input v-model="editForm.phone" placeholder="请输入电话" />
        </el-form-item>
        <el-form-item label="年龄" prop="age">
          <el-input-number v-model="editForm.age" :min="1" :max="120" placeholder="请输入年龄" style="width:100%" />
        </el-form-item>
        <el-form-item label="性别" prop="gender">
          <el-select v-model="editForm.gender" placeholder="请选择性别" style="width:100%">
            <el-option label="男" value="male" />
            <el-option label="女" value="female" />
          </el-select>
        </el-form-item>
        <el-form-item label="政治面貌" prop="politicalStatus">
          <el-select v-model="editForm.politicalStatus" placeholder="请选择政治面貌" style="width:100%">
            <el-option label="群众" value="mass" />
            <el-option label="党员" value="party" />
            <el-option label="团员" value="league" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="所属社区" prop="community">
          <el-input v-model="editForm.community" placeholder="请输入社区" />
        </el-form-item>
        <el-form-item label="家庭住址" prop="address">
          <el-input v-model="editForm.address" placeholder="请输入家庭住址" />
        </el-form-item>
        <el-form-item label="个人特长" prop="specialty">
          <el-input v-model="editForm.specialty" placeholder="请输入个人特长" />
        </el-form-item>
        <el-form-item label="服务意向" prop="serviceIntention">
          <el-input v-model="editForm.serviceIntention" placeholder="请输入服务意向" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="editForm.remark" type="textarea" :rows="3" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditModal = false">取消</el-button>
        <el-button type="primary" @click="submitEditForm" :loading="editSubmitting">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showServiceModal" :title="editingService ? '编辑服务记录' : '添加服务记录'" width="600px" :border-radius="'24px'">
      <el-form :model="serviceForm" label-width="100px" :rules="serviceRules" ref="serviceFormRef">
        <el-form-item label="服务日期" prop="serviceDate">
          <el-date-picker v-model="serviceForm.serviceDate" type="date" placeholder="请选择日期" style="width:100%" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="服务内容" prop="serviceContent">
          <el-input v-model="serviceForm.serviceContent" placeholder="请输入服务内容" />
        </el-form-item>
        <el-form-item label="服务社区" prop="serviceCommunity">
          <el-input v-model="serviceForm.serviceCommunity" placeholder="请输入服务社区" />
        </el-form-item>
        <el-form-item label="服务时长" prop="serviceDuration">
          <el-input v-model="serviceForm.serviceDuration" placeholder="例如：2小时、半天、1天" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="serviceForm.remark" type="textarea" :rows="2" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showServiceModal = false">取消</el-button>
        <el-button type="primary" @click="submitServiceForm" :loading="serviceSubmitting">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '@/utils/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const volunteer = ref(null)
const services = ref([])

const showEditModal = ref(false)
const editSubmitting = ref(false)
const editFormRef = ref(null)
const editForm = ref({
  name: '',
  phone: '',
  age: '',
  gender: '',
  politicalStatus: '',
  community: '',
  address: '',
  specialty: '',
  serviceIntention: '',
  remark: ''
})

const editRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入电话', trigger: 'blur' }],
  age: [{ required: true, message: '请输入年龄', trigger: 'blur' }],
  gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
  politicalStatus: [{ required: true, message: '请选择政治面貌', trigger: 'change' }],
  community: [{ required: true, message: '请输入社区', trigger: 'blur' }],
  address: [{ required: true, message: '请输入家庭住址', trigger: 'blur' }]
}

const showServiceModal = ref(false)
const serviceSubmitting = ref(false)
const serviceFormRef = ref(null)
const editingService = ref(null)
const serviceForm = ref({
  serviceDate: '',
  serviceContent: '',
  serviceDuration: '',
  serviceCommunity: '',
  remark: ''
})

const serviceRules = {
  serviceDate: [{ required: true, message: '请选择日期', trigger: 'change' }],
  serviceContent: [{ required: true, message: '请输入服务内容', trigger: 'blur' }],
  serviceDuration: [{ required: true, message: '请输入服务时长', trigger: 'blur' }],
  serviceCommunity: [{ required: true, message: '请输入服务社区', trigger: 'blur' }]
}

const communityDistribution = computed(() => {
  const map = {}
  services.value.forEach(s => {
    const c = s.serviceCommunity || '未知'
    map[c] = (map[c] || 0) + 1
  })
  const items = Object.entries(map).map(([community, count]) => ({ community, count }))
  const max = Math.max(...items.map(i => i.count), 1)
  items.forEach(i => { i.percent = Math.round((i.count / max) * 100) })
  items.sort((a, b) => b.count - a.count)
  return items
})

const totalDurationText = computed(() => {
  if (services.value.length === 0) return '0小时'
  let totalHours = 0
  services.value.forEach(s => {
    const d = s.serviceDuration || ''
    const hourMatch = d.match(/(\d+)\s*小时/)
    if (hourMatch) totalHours += parseInt(hourMatch[1])
    else if (d.includes('半天')) totalHours += 4
    else if (d.includes('天')) {
      const dayMatch = d.match(/(\d+)\s*天/)
      totalHours += (dayMatch ? parseInt(dayMatch[1]) : 1) * 8
    }
  })
  return totalHours > 0 ? `${totalHours}小时` : '0小时'
})

const latestServiceDate = computed(() => {
  if (services.value.length === 0) return ''
  const sorted = [...services.value].sort((a, b) => new Date(b.serviceDate) - new Date(a.serviceDate))
  return formatDateShort(sorted[0].serviceDate)
})

const evalScore = computed(() => {
  if (services.value.length === 0) return 0
  return Math.min(5, 3 + services.value.length * 0.2).toFixed(1)
})

function getPoliticalStatusLabel(status) {
  const map = { mass: '群众', party: '党员', league: '团员', other: '其他' }
  return map[status] || status
}

async function fetchVolunteer() {
  loading.value = true
  try {
    const response = await api.get(`/volunteers/${route.params.id}`)
    volunteer.value = response.data
    services.value = response.data.services || []
  } catch (error) {
    ElMessage.error('获取志愿者详情失败')
  } finally {
    loading.value = false
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateShort(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}-${day}`
}

function goBack() {
  router.back()
}

function openEditModal() {
  editForm.value = {
    name: volunteer.value.name || '',
    phone: volunteer.value.phone || '',
    age: volunteer.value.age || '',
    gender: volunteer.value.gender || '',
    politicalStatus: volunteer.value.politicalStatus || '',
    community: volunteer.value.community || '',
    address: volunteer.value.address || '',
    specialty: volunteer.value.specialty || '',
    serviceIntention: volunteer.value.serviceIntention || '',
    remark: volunteer.value.remark || ''
  }
  showEditModal.value = true
}

async function submitEditForm() {
  if (!editFormRef.value) return
  await editFormRef.value.validate(async (valid) => {
    if (!valid) return
    editSubmitting.value = true
    try {
      await api.put(`/volunteers/${volunteer.value.id}`, editForm.value)
      ElMessage.success('更新成功')
      showEditModal.value = false
      await fetchVolunteer()
    } catch (error) {
      ElMessage.error(error.response?.data?.error || '更新失败')
    } finally {
      editSubmitting.value = false
    }
  })
}

async function handleDeleteVolunteer() {
  try {
    await ElMessageBox.confirm('确定要删除该志愿者吗？删除后不可恢复。', '确认删除', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger'
    })
    await api.delete(`/volunteers/${volunteer.value.id}`)
    ElMessage.success('删除成功')
    router.push('/volunteers')
  } catch (error) {
    if (error !== 'cancel') ElMessage.error('删除失败')
  }
}

function showAddServiceModal() {
  editingService.value = null
  serviceForm.value = {
    serviceDate: '',
    serviceContent: '',
    serviceDuration: '',
    serviceCommunity: '',
    remark: ''
  }
  showServiceModal.value = true
}

function showEditServiceModal(service) {
  editingService.value = service
  serviceForm.value = {
    serviceDate: service.serviceDate,
    serviceContent: service.serviceContent,
    serviceDuration: service.serviceDuration,
    serviceCommunity: service.serviceCommunity,
    remark: service.remark || ''
  }
  showServiceModal.value = true
}

async function submitServiceForm() {
  if (!serviceFormRef.value) return
  await serviceFormRef.value.validate(async (valid) => {
    if (!valid) return
    serviceSubmitting.value = true
    try {
      if (editingService.value) {
        await api.put(`/volunteers/${volunteer.value.id}/services/${editingService.value.id}`, serviceForm.value)
        ElMessage.success('更新成功')
      } else {
        await api.post(`/volunteers/${volunteer.value.id}/services`, serviceForm.value)
        ElMessage.success('添加成功')
      }
      showServiceModal.value = false
      await fetchVolunteer()
    } catch (error) {
      ElMessage.error(error.response?.data?.error || '操作失败')
    } finally {
      serviceSubmitting.value = false
    }
  })
}

async function handleDeleteService(service) {
  try {
    await ElMessageBox.confirm('确定要删除该服务记录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await api.delete(`/volunteers/${volunteer.value.id}/services/${service.id}`)
    ElMessage.success('删除成功')
    await fetchVolunteer()
  } catch (error) {
    if (error !== 'cancel') ElMessage.error('删除失败')
  }
}

onMounted(() => {
  fetchVolunteer()
})
</script>

<style scoped lang="scss">
.volunteer-detail-page {
  position: relative;
  z-index: 1;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: 999px;
  border: none;
  background: rgba(74, 127, 181, 0.1);
  color: var(--primary);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(74, 127, 181, 0.18);
  }

  svg {
    width: 16px;
    height: 16px;
  }
}

.page-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 24px;
  color: var(--fg);
  margin: 0;
  flex: 1;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-edit {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  border-radius: 999px;
  border: none;
  background: var(--primary);
  color: white;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    opacity: 0.9;
    box-shadow: var(--shadow-hover);
  }

  svg {
    width: 16px;
    height: 16px;
  }
}

.btn-delete {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  border-radius: 999px;
  border: 1.5px solid var(--destructive);
  background: transparent;
  color: var(--destructive);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(212, 114, 106, 0.08);
  }

  svg {
    width: 16px;
    height: 16px;
  }
}

.loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 80px 0;
  color: var(--muted-fg);
  font-size: 14px;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 0;
  color: var(--muted-fg);
  font-size: 14px;
}

.overview-card {
  background: var(--card-bg);
  border: 1px solid rgba(222, 216, 207, 0.5);
  border-radius: 24px;
  padding: 28px 32px;
  box-shadow: var(--shadow-soft);
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.overview-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.volunteer-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 30px;
  color: white;
  flex-shrink: 0;
}

.overview-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.overview-name {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 22px;
  color: var(--fg);
  margin: 0;
}

.overview-phone {
  font-size: 14px;
  color: var(--muted-fg);
  margin: 0;
}

.overview-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.badge {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 10px;
  border-radius: 999px;
  white-space: nowrap;
}

.badge-blue {
  background: rgba(74, 127, 181, 0.1);
  color: var(--primary);
}

.badge-red {
  background: rgba(212, 114, 106, 0.1);
  color: var(--destructive);
}

.badge-yellow {
  background: rgba(232, 184, 75, 0.12);
  color: var(--secondary);
}

.overview-stats {
  display: flex;
  align-items: center;
  gap: 24px;
}

.overview-stat {
  text-align: center;
}

.overview-stat-value {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 20px;
  color: var(--fg);
  line-height: 1.2;
}

.overview-stat-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--muted-fg);
  margin-top: 4px;
}

.stat-divider {
  width: 1px;
  height: 36px;
  background: var(--border);
}

.two-col-layout {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  align-items: start;
}

.col-left,
.col-right {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.card {
  background: var(--card-bg);
  border: 1px solid rgba(222, 216, 207, 0.5);
  border-radius: 24px;
  padding: 24px;
  box-shadow: var(--shadow-soft);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.card-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 18px;
  color: var(--fg);
  margin: 0;
}

.info-fields {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.info-field {
  display: flex;
  align-items: flex-start;
  padding: 12px 0;
  border-bottom: 1px solid rgba(222, 216, 207, 0.3);

  &:last-child {
    border-bottom: none;
  }
}

.field-label {
  width: 90px;
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--muted-fg);
}

.field-value {
  font-size: 14px;
  color: var(--fg);
  flex: 1;
}

.field-remark {
  .remark-content {
    background: rgba(232, 184, 75, 0.08);
    border-radius: 8px;
    padding: 8px 12px;
    display: inline-block;
    line-height: 1.6;
  }
}

.btn-add-service {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border-radius: 999px;
  border: none;
  background: var(--primary);
  color: white;
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    opacity: 0.9;
    box-shadow: var(--shadow-hover);
  }

  svg {
    width: 14px;
    height: 14px;
  }
}

.empty-state-sm {
  text-align: center;
  padding: 32px 0;
  color: var(--muted-fg);
  font-size: 14px;
}

.service-table {
  :deep(.el-table__header-wrapper th) {
    background: rgba(240, 235, 229, 0.4) !important;
    font-weight: 600;
    font-size: 13px;
    color: var(--muted-fg);
  }

  :deep(.el-table__body-wrapper td) {
    font-size: 13px;
    color: var(--fg);
  }

  :deep(.el-table__row:hover > td) {
    background: rgba(74, 127, 181, 0.04) !important;
  }

  :deep(.el-table__inner-wrapper::before) {
    display: none;
  }

  :deep(.el-table) {
    --el-table-border-color: rgba(222, 216, 207, 0.3);
    --el-table-header-bg-color: transparent;
  }
}

.table-badge {
  font-size: 11px;
  padding: 1px 8px;
}

.table-actions {
  display: flex;
  gap: 6px;
}

.action-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  svg {
    width: 14px;
    height: 14px;
  }

  &.edit {
    color: var(--primary);
    &:hover { background: rgba(74, 127, 181, 0.1); }
  }

  &.delete {
    color: var(--destructive);
    &:hover { background: rgba(212, 114, 106, 0.1); }
  }
}

.dist-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dist-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dist-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dist-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--fg);
}

.dist-count {
  font-size: 12px;
  font-weight: 600;
  color: var(--primary);
}

.dist-bar-bg {
  height: 8px;
  border-radius: 999px;
  background: rgba(222, 216, 207, 0.4);
  overflow: hidden;
}

.dist-bar-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--primary), rgba(74, 127, 181, 0.6));
  transition: width 0.6s ease;
}

.eval-score {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(222, 216, 207, 0.3);
}

.eval-number {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 36px;
  color: var(--secondary);
  line-height: 1;
}

.eval-stars {
  display: flex;
  gap: 2px;
}

.star-icon {
  width: 20px;
  height: 20px;
}

.eval-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.eval-stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.eval-stat-label {
  font-size: 13px;
  color: var(--muted-fg);
}

.eval-stat-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--fg);
}

@media (max-width: 900px) {
  .two-col-layout {
    grid-template-columns: 1fr;
  }

  .overview-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
  }

  .overview-stats {
    width: 100%;
    justify-content: space-around;
  }
}
</style>
