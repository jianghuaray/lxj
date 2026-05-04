<template>
  <div class="volunteer-add-page">
    <div class="page-header">
      <h1 class="page-title">{{ isEdit ? '编辑志愿者' : '新增志愿者' }}</h1>
      <div class="header-actions">
        <button class="btn-cancel" @click="$router.back()">取消</button>
        <button class="btn-save" @click="submitForm" :disabled="submitLoading">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          保存
        </button>
      </div>
    </div>

    <div class="form-card">
      <div class="form-grid">
        <div class="form-field">
          <label class="form-label">姓名<span class="required">*</span></label>
          <input type="text" class="form-input" v-model="form.name" placeholder="请输入姓名" />
          <span class="field-error" v-if="errors.name">{{ errors.name }}</span>
        </div>
        <div class="form-field">
          <label class="form-label">联系方式<span class="required">*</span></label>
          <input type="tel" class="form-input" v-model="form.phone" placeholder="请输入手机号" maxlength="11" />
          <span class="field-error" v-if="errors.phone">{{ errors.phone }}</span>
        </div>
        <div class="form-field">
          <label class="form-label">年龄<span class="required">*</span></label>
          <input type="number" class="form-input" v-model.number="form.age" placeholder="请输入年龄" min="1" max="120" />
          <span class="field-error" v-if="errors.age">{{ errors.age }}</span>
        </div>
        <div class="form-field">
          <label class="form-label">性别<span class="required">*</span></label>
          <select class="form-select" v-model="form.gender">
            <option value="" disabled>请选择性别</option>
            <option value="male">男</option>
            <option value="female">女</option>
          </select>
          <span class="field-error" v-if="errors.gender">{{ errors.gender }}</span>
        </div>
        <div class="form-field">
          <label class="form-label">政治面貌<span class="required">*</span></label>
          <select class="form-select" v-model="form.politicalStatus">
            <option value="" disabled>请选择政治面貌</option>
            <option value="mass">群众</option>
            <option value="party">党员</option>
            <option value="league">团员</option>
            <option value="other">其他</option>
          </select>
          <span class="field-error" v-if="errors.politicalStatus">{{ errors.politicalStatus }}</span>
        </div>
        <div class="form-field">
          <label class="form-label">所属社区<span class="required">*</span></label>
          <select class="form-select" v-model="form.community">
            <option value="" disabled>请选择社区</option>
            <option v-for="c in communityOptions" :key="c" :value="c">{{ c }}</option>
          </select>
          <span class="field-error" v-if="errors.community">{{ errors.community }}</span>
        </div>
        <div class="form-field full-width">
          <label class="form-label">家庭住址<span class="required">*</span></label>
          <input type="text" class="form-input" v-model="form.address" placeholder="请输入家庭住址" />
          <span class="field-error" v-if="errors.address">{{ errors.address }}</span>
        </div>
        <div class="form-field full-width">
          <label class="form-label">个人特长</label>
          <input type="text" class="form-input" v-model="form.specialty" placeholder="请输入个人特长" />
        </div>
        <div class="form-field full-width">
          <label class="form-label">服务意向</label>
          <input type="text" class="form-input" v-model="form.serviceIntention" placeholder="请输入服务意向" />
        </div>
        <div class="form-field full-width">
          <label class="form-label">备注</label>
          <textarea class="form-textarea" v-model="form.remark" placeholder="请输入备注信息"></textarea>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/utils/api'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const submitLoading = ref(false)
const isEdit = ref(false)

const communityOptions = ['幸福社区', '凤城社区', '锦业社区', '金色阳光社区', '紫薇社区', '龙湖社区']

const form = ref({
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

const errors = ref({})

function validate() {
  const e = {}
  if (!form.value.name.trim()) e.name = '请输入姓名'
  if (!form.value.phone.trim()) {
    e.phone = '请输入联系方式'
  } else if (!/^1[3-9]\d{9}$/.test(form.value.phone)) {
    e.phone = '请输入正确的手机号'
  }
  if (!form.value.age) e.age = '请输入年龄'
  else if (form.value.age < 1 || form.value.age > 120) e.age = '请输入有效年龄'
  if (!form.value.gender) e.gender = '请选择性别'
  if (!form.value.politicalStatus) e.politicalStatus = '请选择政治面貌'
  if (!form.value.community) e.community = '请选择所属社区'
  if (!form.value.address.trim()) e.address = '请输入家庭住址'
  errors.value = e
  return Object.keys(e).length === 0
}

async function fetchVolunteer() {
  const id = route.params.id
  if (id) {
    isEdit.value = true
    try {
      const response = await api.get(`/volunteers/${id}`)
      const data = response.data
      form.value = {
        name: data.name || '',
        phone: data.phone || '',
        age: data.age || '',
        gender: data.gender || '',
        politicalStatus: data.politicalStatus || '',
        community: data.community || '',
        address: data.address || '',
        specialty: data.specialty || '',
        serviceIntention: data.serviceIntention || '',
        remark: data.remark || ''
      }
    } catch (error) {
      ElMessage.error('获取志愿者信息失败')
    }
  }
}

async function submitForm() {
  if (!validate()) return
  submitLoading.value = true
  try {
    const id = route.params.id
    if (id) {
      await api.put(`/volunteers/${id}`, form.value)
      ElMessage.success('修改成功')
    } else {
      await api.post('/volunteers', form.value)
      ElMessage.success('添加成功')
    }
    router.push('/volunteers')
  } catch (error) {
    ElMessage.error(error.response?.data?.error || '操作失败')
  } finally {
    submitLoading.value = false
  }
}

onMounted(() => {
  fetchVolunteer()
})
</script>

<style scoped lang="scss">
.volunteer-add-page {
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-cancel {
  height: 36px;
  padding: 0 24px;
  border-radius: 999px;
  border: 1.5px solid var(--border);
  background: transparent;
  color: var(--muted-fg);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--primary);
    color: var(--primary);
  }
}

.btn-save {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  padding: 0 24px;
  border-radius: 999px;
  border: 1.5px solid var(--primary);
  background: var(--primary);
  color: white;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: var(--shadow-soft);

  &:hover {
    background: #3D6FA0;
    border-color: #3D6FA0;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.form-card {
  background: var(--card-bg);
  border: 1px solid rgba(222, 216, 207, 0.5);
  border-radius: 24px;
  box-shadow: var(--shadow-soft);
  padding: 32px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px 24px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;

  &.full-width {
    grid-column: 1 / -1;
  }
}

.form-label {
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 13px;
  color: var(--accent-fg);

  .required {
    color: var(--destructive);
    margin-left: 2px;
  }
}

.form-input {
  width: 100%;
  height: 40px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid rgba(222, 216, 207, 0.8);
  background: rgba(255, 255, 255, 0.5);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 400;
  color: var(--fg);
  outline: none;
  transition: all 0.2s ease;
  box-sizing: border-box;

  &::placeholder {
    color: var(--muted-fg);
    opacity: 0.6;
  }

  &:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(74, 127, 181, 0.15);
    background: rgba(255, 255, 255, 0.8);
  }
}

.form-select {
  width: 100%;
  height: 40px;
  padding: 0 36px 0 16px;
  border-radius: 999px;
  border: 1px solid rgba(222, 216, 207, 0.8);
  background: rgba(255, 255, 255, 0.5);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 400;
  color: var(--fg);
  outline: none;
  transition: all 0.2s ease;
  box-sizing: border-box;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2378786c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  cursor: pointer;

  &:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(74, 127, 181, 0.15);
    background-color: rgba(255, 255, 255, 0.8);
  }

  &:invalid {
    color: var(--muted-fg);
    opacity: 0.6;
  }
}

.form-textarea {
  width: 100%;
  min-height: 80px;
  padding: 12px 16px;
  border-radius: 16px;
  border: 1px solid rgba(222, 216, 207, 0.8);
  background: rgba(255, 255, 255, 0.5);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 400;
  color: var(--fg);
  outline: none;
  resize: vertical;
  transition: all 0.2s ease;
  box-sizing: border-box;
  line-height: 1.6;

  &::placeholder {
    color: var(--muted-fg);
    opacity: 0.6;
  }

  &:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(74, 127, 181, 0.15);
    background: rgba(255, 255, 255, 0.8);
  }
}

.field-error {
  font-family: var(--font-body);
  font-size: 12px;
  color: var(--destructive);
  padding-left: 4px;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-card {
    padding: 20px;
  }
}
</style>
