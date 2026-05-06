<template>
  <div class="customer-add-page">
    <div class="page-header">
      <h1 class="page-title">{{ isEdit ? '编辑客户' : '新增客户' }}</h1>
      <div class="header-actions">
        <button class="btn-cancel" @click="$router.back()">取消</button>
        <button class="btn-save" @click="submitForm" :disabled="submitLoading">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          保存
        </button>
      </div>
    </div>

    <div class="form-card">
      <div class="section-title">基本信息</div>
      <div class="form-grid">
        <div class="form-field">
          <label class="form-label">姓名<span class="required">*</span></label>
          <input type="text" class="form-input" v-model="form.name" placeholder="请输入客户姓名" maxlength="20" />
          <span class="field-error" v-if="errors.name">{{ errors.name }}</span>
        </div>
        <div class="form-field">
          <label class="form-label">联系方式<span class="required">*</span></label>
          <input type="text" class="form-input" v-model="phoneProxy" placeholder="请输入手机号" maxlength="11" inputmode="numeric" @blur="checkPhoneExist" />
          <span class="field-error" v-if="errors.phone">{{ errors.phone }}</span>
          <!-- 客户匹配提示 -->
          <div class="match-container" :class="{ show: phoneChecked }">
            <div class="match-found" v-if="matchedCustomer">
              <div class="match-found-header">
                <span class="match-found-title">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                  已匹配到客户档案
                </span>
                <span class="match-badge">{{ matchedCustomer.level || '普通客户' }}</span>
              </div>
              <div class="match-info-grid">
                <span>姓名：<strong>{{ matchedCustomer.name }}</strong></span>
                <span>区域：<strong>{{ matchedCustomer.area || '-' }}</strong></span>
                <span class="full-span">地址：<strong>{{ matchedCustomer.address || '-' }}</strong></span>
              </div>
              <div class="match-tags" v-if="matchedCustomer.tags && matchedCustomer.tags.length">
                <span class="match-tag" v-for="t in matchedCustomer.tags" :key="t">{{ t }}</span>
              </div>
              <div class="match-remark" v-if="matchedCustomer.remark">备注：{{ matchedCustomer.remark }}</div>
              <div class="match-hint">该手机号已注册，请确认是否为同一客户</div>
            </div>
            <div class="match-not-found" v-else>
              <span class="match-not-found-text">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                新客户 - 该手机号未在系统中注册
              </span>
            </div>
          </div>
        </div>
        <div class="form-field">
          <label class="form-label">区域<span class="required">*</span></label>
          <select class="form-select" v-model="form.area">
            <option value="" disabled>请选择区域</option>
            <option v-for="a in settingsStore.areas" :key="a" :value="a">{{ a }}</option>
          </select>
          <span class="field-error" v-if="errors.area">{{ errors.area }}</span>
        </div>
        <div class="form-field">
          <label class="form-label">详细地址<span class="required">*</span></label>
          <input type="text" class="form-input" v-model="form.address" placeholder="请输入详细地址" />
          <span class="field-error" v-if="errors.address">{{ errors.address }}</span>
        </div>
        <div class="form-field">
          <label class="form-label">客户等级<span class="required">*</span></label>
          <select class="form-select" v-model="form.level">
            <option value="normal" selected>普通客户</option>
            <option value="vip">VIP客户</option>
            <option value="blacklist">黑名单</option>
          </select>
        </div>
        <div class="form-field">
          <label class="form-label">来源渠道</label>
          <select class="form-select" v-model="form.sourceChannel">
            <option value="" disabled selected>请选择来源渠道</option>
            <option v-for="s in settingsStore.channels" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <div class="form-field full-width">
          <label class="form-label">备注/偏好</label>
          <textarea class="form-textarea" v-model="form.remark" placeholder="客户特殊偏好、注意事项等，如：老人独居需耐心沟通、只接受周末上门..." rows="3"></textarea>
        </div>
      </div>
    </div>

    <!-- 客户标签 -->
    <div class="tag-card">
      <div class="section-title">客户标签</div>
      <div class="tag-section-label">当前标签</div>
      <div class="tag-current-area" ref="tagCurrentArea">
        <span class="tag-empty-hint" v-if="!activeTags.length">暂无标签</span>
        <span class="tag-active" v-for="tag in activeTags" :key="tag">
          {{ tag }}
          <span class="tag-remove" @click="removeTag(tag)">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </span>
        </span>
      </div>
      <div class="tag-section-label" style="margin-top: 16px;">可用标签</div>
      <div class="tag-available-area">
        <span class="tag-available" v-for="tag in availableTags" :key="tag"
              :class="{ used: activeTags.includes(tag) }"
              @click="toggleTag(tag)">{{ tag }}</span>
        <button class="tag-add-btn" @click="showCustomTagInput" title="自定义标签">+</button>
        <div class="tag-custom-input" :class="{ show: customTagInputVisible }">
          <input type="text" ref="customTagInput" v-model="customTagName" placeholder="输入标签名" maxlength="10" @keydown.enter="confirmCustomTag" />
          <button class="tag-custom-confirm" @click="confirmCustomTag">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/utils/api'
import { ElMessage } from 'element-plus'
import { useSettingsStore } from '@/stores/settings'

const route = useRoute()
const router = useRouter()
const settingsStore = useSettingsStore()
const submitLoading = ref(false)
const isEdit = ref(false)
const tagCurrentArea = ref(null)
const customTagInput = ref(null)

const defaultAvailableTags = ['某小区业主', '价格敏感', '周末预约', '老人家庭', '新客户', '回头客']
const availableTags = ref([...defaultAvailableTags])

const form = ref({
  name: '',
  phone: '',
  area: '',
  address: '',
  level: '普通客户',
  sourceChannel: '',
  remark: ''
})

const errors = ref({})
const phoneChecked = ref(false)
const matchedCustomer = ref(null)
const activeTags = ref([])
const customTagInputVisible = ref(false)
const customTagName = ref('')

const phoneProxy = computed({
  get: () => form.value.phone,
  set: (val) => { form.value.phone = val.replace(/[^0-9]/g, '') }
})

function validate() {
  const e = {}
  if (!form.value.name.trim()) e.name = '请输入客户姓名'
  if (!form.value.phone.trim()) {
    e.phone = '请输入联系方式'
  }
  if (!form.value.area) e.area = '请选择区域'
  if (!form.value.address.trim()) e.address = '请输入详细地址'
  if (!form.value.level) e.level = '请选择客户等级'
  errors.value = e
  return Object.keys(e).length === 0
}

async function checkPhoneExist() {
  const phone = form.value.phone.trim()
  if (phone.length < 11) {
    phoneChecked.value = false
    matchedCustomer.value = null
    return
  }
  try {
    const res = await api.get('/customers', { params: { keyword: phone, pageSize: 1 } })
    const list = res.data.items || []
    const found = list.find(c => c.phone === phone && c.id !== (route.params.id || route.query.id))
    if (found) {
      matchedCustomer.value = found
    } else {
      matchedCustomer.value = null
    }
    phoneChecked.value = true
  } catch (e) {
    phoneChecked.value = false
  }
}

function toggleTag(tag) {
  if (activeTags.value.includes(tag)) {
    removeTag(tag)
  } else {
    addTag(tag)
  }
}

function addTag(tag) {
  if (activeTags.value.includes(tag)) return
  activeTags.value.push(tag)
}

function removeTag(tag) {
  activeTags.value = activeTags.value.filter(t => t !== tag)
}

function showCustomTagInput() {
  customTagInputVisible.value = true
  nextTick(() => {
    customTagInput.value?.focus()
  })
}

function confirmCustomTag() {
  const val = customTagName.value.trim()
  if (!val) {
    customTagInputVisible.value = false
    return
  }
  if (!availableTags.value.includes(val)) {
    availableTags.value.push(val)
  }
  if (!activeTags.value.includes(val)) {
    activeTags.value.push(val)
  }
  customTagName.value = ''
  customTagInputVisible.value = false
}

async function fetchCustomer() {
  const id = route.params.id || route.query.id
  if (id) {
    isEdit.value = true
    try {
      const res = await api.get(`/customers/${id}`)
      const data = res.data
      form.value = {
        name: data.name || '',
        phone: data.phone || '',
        area: data.area || '',
        address: data.address || '',
        level: data.level || '普通客户',
        sourceChannel: data.sourceChannel || '',
        remark: data.remark || ''
      }
      activeTags.value = data.tags || []
      phoneChecked.value = true
      matchedCustomer.value = data
    } catch (error) {
      ElMessage.error('获取客户信息失败')
    }
  }
}

async function submitForm() {
  if (!validate()) return
  submitLoading.value = true
  try {
    const id = route.params.id || route.query.id
    const payload = {
      ...form.value,
      tags: activeTags.value
    }
    if (id) {
      await api.put(`/customers/${id}`, payload)
      ElMessage.success('修改成功')
    } else {
      await api.post('/customers', payload)
      ElMessage.success('添加成功')
    }
    router.push('/customers')
  } catch (error) {
    ElMessage.error(error.response?.data?.error || '操作失败')
  } finally {
    submitLoading.value = false
  }
}

onMounted(() => {
  if (!settingsStore.loaded) settingsStore.fetchAll()
  fetchCustomer()
})
</script>

<style scoped lang="scss">
.customer-add-page {
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

/* ===== Form Card ===== */
.form-card {
  background: var(--card-bg);
  border-radius: 24px;
  border: 1px solid rgba(222, 216, 207, 0.5);
  box-shadow: var(--shadow-soft);
  padding: 28px;
  margin-bottom: 20px;
}

.section-title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 16px;
  color: var(--fg);
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid var(--primary);
  display: inline-block;
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
  color: #5C5A4E;
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
  transition: all 0.25s ease;
  box-sizing: border-box;
  &:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(74, 127, 181, 0.15);
    background: rgba(255, 255, 255, 0.8);
  }
  &::placeholder {
    color: var(--muted-fg);
    opacity: 0.6;
  }
}

.form-select {
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
  transition: all 0.25s ease;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%2378786C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 16px center;
  padding-right: 40px;
  box-sizing: border-box;
  &:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(74, 127, 181, 0.15);
    background-color: rgba(255, 255, 255, 0.8);
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
  transition: all 0.25s ease;
  line-height: 1.6;
  box-sizing: border-box;
  &:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(74, 127, 181, 0.15);
    background: rgba(255, 255, 255, 0.8);
  }
  &::placeholder {
    color: var(--muted-fg);
    opacity: 0.6;
  }
}

.field-error {
  font-family: var(--font-body);
  font-size: 12px;
  color: var(--destructive);
  padding-left: 4px;
}

/* ===== Phone Match ===== */
.match-container {
  display: none;
  margin-top: 4px;
  &.show {
    display: block;
  }
}

.match-found {
  background: rgba(74, 127, 181, 0.08);
  border-radius: 16px;
  padding: 14px 18px;
  border: 1px solid rgba(74, 127, 181, 0.2);
  animation: fadeIn 0.3s ease;
}

.match-found-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.match-found-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--primary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.match-badge {
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(232, 184, 75, 0.15);
  color: #B8922E;
  font-weight: 600;
}

.match-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  font-size: 12px;
  color: var(--muted-fg);
  strong {
    color: var(--fg);
  }
  .full-span {
    grid-column: 1 / -1;
  }
}

.match-tags {
  margin-top: 8px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.match-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(230, 220, 205, 0.4);
  color: var(--accent-fg);
}

.match-remark {
  margin-top: 6px;
  font-size: 11px;
  color: var(--muted-fg);
  font-style: italic;
}

.match-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--muted-fg);
}

.match-not-found {
  background: rgba(232, 184, 75, 0.08);
  border-radius: 16px;
  padding: 14px 18px;
  border: 1px solid rgba(232, 184, 75, 0.2);
  animation: fadeIn 0.3s ease;
}

.match-not-found-text {
  font-size: 13px;
  font-weight: 500;
  color: #9A7A1F;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* ===== Tag Card ===== */
.tag-card {
  background: var(--card-bg);
  border-radius: 20px;
  border: 1px solid rgba(222, 216, 207, 0.5);
  box-shadow: var(--shadow-soft);
  padding: 28px;
  margin-bottom: 20px;
}

.tag-section-label {
  font-size: 13px;
  font-weight: 600;
  color: #5C5A4E;
  margin-bottom: 10px;
}

.tag-current-area {
  min-height: 44px;
  background: rgba(240, 235, 229, 0.3);
  border-radius: 16px;
  padding: 12px 16px;
  margin-bottom: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.tag-empty-hint {
  font-size: 13px;
  color: var(--muted-fg);
  opacity: 0.6;
  font-style: italic;
}

.tag-active {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  border-radius: 999px;
  background: var(--primary);
  color: white;
  font-size: 13px;
  font-weight: 600;
  animation: tagPop 0.25s ease;
}

.tag-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: background 0.2s ease;
  &:hover {
    background: rgba(255, 255, 255, 0.5);
  }
}

.tag-available-area {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.tag-available {
  padding: 5px 14px;
  border-radius: 999px;
  background: var(--muted);
  color: var(--muted-fg);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.25s ease;
  &.used {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
    cursor: default;
  }
  &:not(.used):hover {
    background: rgba(74, 127, 181, 0.1);
    color: var(--primary);
    border-color: rgba(74, 127, 181, 0.2);
  }
}

.tag-add-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1.5px dashed var(--border);
  background: transparent;
  color: var(--muted-fg);
  cursor: pointer;
  transition: all 0.25s ease;
  font-size: 16px;
  font-weight: 600;
  font-family: var(--font-body);
  &:hover {
    border-color: var(--primary);
    color: var(--primary);
    background: rgba(74, 127, 181, 0.05);
  }
}

.tag-custom-input {
  display: none;
  align-items: center;
  gap: 6px;
  &.show {
    display: inline-flex;
  }
  input {
    height: 32px;
    padding: 0 14px;
    border-radius: 999px;
    border: 1px solid rgba(222, 216, 207, 0.8);
    background: rgba(255, 255, 255, 0.5);
    font-family: var(--font-body);
    font-size: 13px;
    color: var(--fg);
    outline: none;
    transition: all 0.25s ease;
    width: 120px;
    box-sizing: border-box;
    &:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(74, 127, 181, 0.15);
    }
  }
}

.tag-custom-confirm {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: var(--primary);
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover {
    background: #3D6FA0;
  }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes tagPop {
  0% { transform: scale(0.8); opacity: 0; }
  60% { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
    .full-width { grid-column: 1; }
  }
  .form-card, .tag-card { padding: 20px; }
}
</style>
