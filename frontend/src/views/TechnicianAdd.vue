<template>
  <div class="technician-add-page">
    <div class="page-header">
      <div class="header-left">
        <button class="action-btn" @click="$router.back()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          返回
        </button>
        <h1 class="page-title">{{ isEdit ? '编辑师傅' : '添加师傅' }}</h1>
      </div>
    </div>

    <div class="form-card">
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="no-label-form">
        <div class="form-section">
          <div class="section-title">基本信息</div>
          <div class="form-grid">
            <div class="form-field">
              <label class="form-label">姓名<span class="required">*</span></label>
              <el-form-item prop="name" style="margin-bottom:0;">
                <el-input v-model="form.name" placeholder="请输入师傅姓名" maxlength="20" />
              </el-form-item>
            </div>
            <div class="form-field">
              <label class="form-label">联系方式<span class="required">*</span></label>
              <el-form-item prop="phone" style="margin-bottom:0;">
                <el-input v-model="form.phone" placeholder="请输入手机号" maxlength="11" type="tel" />
              </el-form-item>
            </div>
            <div class="form-field">
              <label class="form-label">默认抽成比例<span class="required">*</span></label>
              <div class="input-group">
                <el-input-number v-model="form.commissionRate" :min="0" :max="100" :step="1" :precision="0" />
                <span class="input-suffix">%</span>
              </div>
            </div>
            <div class="form-field">
              <label class="form-label">状态</label>
              <div class="status-toggle">
                <button type="button" class="status-btn" :class="{ active: form.status === 1 }" @click="form.status = 1">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  启用
                </button>
                <button type="button" class="status-btn" :class="{ active: form.status === 0 }" @click="form.status = 0">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  停用
                </button>
              </div>
            </div>
            <div class="form-field full-width">
              <label class="form-label">备注</label>
              <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="请输入备注信息（选填）" />
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="section-title">擅长类型</div>
          <div class="skill-tags">
            <label v-for="cat in settingsStore.serviceTypes" :key="cat" class="skill-tag" :class="{ selected: form.specialties.includes(cat) }" @click="toggleSpecialty(cat)">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              {{ cat }}
            </label>
          </div>
        </div>
      </el-form>
    </div>

    <div class="action-bar">
      <button class="btn-save" @click="submitForm" :disabled="submitLoading">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
        {{ isEdit ? '保存修改' : '添加师傅' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/utils/api'
import { ElMessage } from 'element-plus'
import { useSettingsStore } from '@/stores/settings'

const route = useRoute()
const router = useRouter()
const settingsStore = useSettingsStore()
const formRef = ref(null)
const submitLoading = ref(false)
const isEdit = ref(false)

const form = ref({
  name: '',
  phone: '',
  specialties: [],
  commissionRate: 30,
  status: 1,
  remark: ''
})

const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入电话', trigger: 'blur' }]
}

function toggleSpecialty(cat) {
  const idx = form.value.specialties.indexOf(cat)
  if (idx >= 0) {
    form.value.specialties.splice(idx, 1)
  } else {
    form.value.specialties.push(cat)
  }
}

async function fetchTechnician() {
  // Check route params for edit mode (e.g., /technicians/edit/:id)
  const techId = route.params.id || route.query.id
  if (techId) {
    isEdit.value = true
    try {
      const response = await api.get(`/technicians/${techId}`)
      const data = response.data
      form.value = {
        name: data.name,
        phone: data.phone,
        specialties: data.specialties || [],
        commissionRate: data.commission_rate ? Math.round(data.commission_rate * 100) : 30,
        status: data.status ?? 1,
        remark: data.remark || ''
      }
    } catch (error) {
      ElMessage.error('获取师傅信息失败')
    }
  }
}

async function submitForm() {
  try { await formRef.value.validate() } catch(e) { return }
  submitLoading.value = true
  try {
    // Determine the technician ID from route params or query
    const techId = route.params.id || route.query.id
    if (techId) {
      await api.put(`/technicians/${techId}`, form.value)
      ElMessage.success('修改成功')
    } else {
      await api.post('/technicians', form.value)
      ElMessage.success('添加成功')
    }
    router.push('/technicians')
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error(error.response?.data?.error || '操作失败')
  } finally {
    submitLoading.value = false
  }
}

onMounted(() => {
  if (!settingsStore.loaded) settingsStore.fetchAll()
  fetchTechnician()
})
</script>

<style scoped lang="scss">
.technician-add-page { position: relative; z-index: 1; }
.page-header { margin-bottom: 20px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.page-title { font-family: var(--font-display); font-weight: 700; font-size: 24px; color: var(--fg); margin: 0; }
.action-btn { background: none; border: none; color: var(--primary); font-family: var(--font-body); font-size: 13px; font-weight: 500; cursor: pointer; padding: 4px 8px; border-radius: 8px; transition: all 0.3s ease; display: inline-flex; align-items: center; gap: 4px; }
.action-btn:hover { background: rgba(74,127,181,0.08); }

.form-card { background: var(--card-bg); border: 1px solid rgba(222,216,207,0.5); border-radius: 24px; box-shadow: var(--shadow-soft); padding: 32px; margin-bottom: 20px; }

.form-section { margin-bottom: 32px; }
.form-section:last-child { margin-bottom: 0; }
.section-title { font-family: var(--font-display); font-weight: 600; font-size: 16px; color: var(--fg); margin-bottom: 24px; padding-bottom: 8px; border-bottom: 2px solid var(--primary); display: inline-block; }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.form-grid .full-width { grid-column: 1 / -1; }

.form-field { display: flex; flex-direction: column; gap: 6px; }
.form-label { font-family: var(--font-body); font-weight: 600; font-size: 13px; color: #5C5A50; }
.form-label .required { color: var(--destructive); margin-left: 2px; }

.form-input { width: 100%; height: 40px; padding: 0 16px; border-radius: 999px; border: 1px solid rgba(222,216,207,0.8); background: rgba(255,255,255,0.5); font-family: var(--font-body); font-size: 14px; font-weight: 400; color: var(--fg); outline: none; transition: all 0.2s ease; }
.form-input::placeholder { color: var(--muted-fg); opacity: 0.6; }
.form-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(74,127,181,0.15); background: rgba(255,255,255,0.8); }

.input-group { position: relative; }
.input-group .form-input { padding-right: 40px; }
.input-suffix { position: absolute; right: 20px; top: 50%; transform: translateY(-50%); font-size: 14px; font-weight: 600; color: var(--muted-fg); pointer-events: none; }

.form-textarea { width: 100%; min-height: 100px; padding: 14px 20px; border-radius: 24px; border: 1px solid rgba(222,216,207,0.8); background: rgba(255,255,255,0.5); font-family: var(--font-body); font-size: 14px; font-weight: 400; color: var(--fg); outline: none; resize: vertical; transition: all 0.3s ease; line-height: 1.6; }
.form-textarea::placeholder { color: var(--muted-fg); opacity: 0.6; }
.form-textarea:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(74,127,181,0.15); background: rgba(255,255,255,0.8); }

.status-toggle { display: flex; gap: 8px; height: 40px; }
.status-btn { flex: 1; height: 40px; border-radius: 999px; border: 1px solid rgba(222,216,207,0.8); background: rgba(255,255,255,0.5); font-family: var(--font-body); font-size: 14px; font-weight: 600; color: var(--muted-fg); cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 6px; }
.status-btn:hover { border-color: var(--border); background: rgba(255,255,255,0.7); }
.status-btn.active { background: var(--primary); border-color: var(--primary); color: white; box-shadow: 0 2px 8px rgba(74,127,181,0.25); }
.status-btn svg { width: 16px; height: 16px; }

.skill-tags { display: flex; flex-wrap: wrap; gap: 10px; }
.skill-tag { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 16px; border-radius: 999px; background: rgba(222,216,207,0.5); color: #8B7E6A; font-family: var(--font-body); font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; user-select: none; border: 1px solid transparent; }
.skill-tag:hover { background: rgba(222,216,207,0.8); transform: translateY(-1px); }
.skill-tag.selected { background: var(--primary); color: white; border-color: var(--primary); box-shadow: 0 2px 8px rgba(74,127,181,0.25); }
.skill-tag svg { width: 16px; height: 16px; opacity: 0.7; transition: opacity 0.3s ease; }
.skill-tag.selected svg { opacity: 1; }

.action-bar { display: flex; align-items: center; justify-content: flex-end; padding: 16px 0 0; }
.btn-save { display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 120px; height: 36px; border-radius: 999px; border: 1.5px solid var(--primary); background: var(--primary); color: white; font-family: var(--font-body); font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; box-shadow: var(--shadow-soft); }
.btn-save:hover { background: #3D6FA0; border-color: #3D6FA0; box-shadow: var(--shadow-soft); }
.btn-save:active { background: #3D6FA0; border-color: #3D6FA0; }
.btn-save svg { width: 18px; height: 18px; }

@media (max-width: 768px) {
  .form-grid { grid-template-columns: 1fr; }
  .form-card { padding: 20px; }
}
</style>
