<template>
  <div class="order-create-page">
    <div class="page-header">
      <h2 class="page-title">新建工单</h2>
      <button class="btn-cancel" @click="$router.back()">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        取消
      </button>
    </div>

    <div class="form-card">
      <div class="section-title">客户信息</div>
      <div class="form-grid">
        <div class="form-field">
          <label class="form-label">客户姓名<span class="required">*</span></label>
          <input type="text" class="form-input" v-model="form.customerName" placeholder="请输入客户姓名">
        </div>
        <div class="form-field">
          <label class="form-label">联系方式<span class="required">*</span></label>
          <input type="tel" class="form-input" v-model="form.customerPhone" placeholder="请输入客户手机号" maxlength="11" @blur="searchCustomer">
        </div>

        <div v-if="phoneSearched" class="full-width customer-match-area">
          <div v-if="matchedCustomer" class="match-found">
            <div class="match-header">
              <span class="match-label">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                已匹配到客户档案
              </span>
              <span v-if="matchedCustomer.level === 'vip'" class="vip-badge">VIP客户</span>
              <span v-else-if="matchedCustomer.level === 'blacklist'" class="blacklist-badge">黑名单</span>
            </div>
            <div class="match-info">
              <span>姓名：<strong>{{ matchedCustomer.name }}</strong></span>
              <span v-if="matchedCustomer.area">区域：<strong>{{ matchedCustomer.area }}</strong></span>
              <span v-if="matchedCustomer.address" class="full-width">地址：<strong>{{ matchedCustomer.address }}</strong></span>
            </div>
            <div v-if="matchedCustomer.tags && matchedCustomer.tags.length" class="match-tags">
              <span v-for="tag in matchedCustomer.tags" :key="tag" class="match-tag">{{ tag }}</span>
            </div>
            <div v-if="matchedCustomer.remark" class="match-remark">{{ matchedCustomer.remark }}</div>
            <div class="match-hint">已自动填入客户信息，如需修改可直接编辑</div>
          </div>
          <div v-else class="match-not-found">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            新客户 - 填写信息后将自动创建客户档案
          </div>
        </div>

        <div class="form-field">
          <label class="form-label">区域<span class="required">*</span></label>
          <el-select v-model="form.area" class="form-select-el" placeholder="请选择所在区域">
            <el-option v-for="area in settingsStore.areas" :key="area" :label="area" :value="area" />
          </el-select>
        </div>
        <div class="form-field">
          <label class="form-label">来源渠道</label>
          <el-select v-model="form.sourceChannel" class="form-select-el" placeholder="请选择来源渠道">
            <el-option v-for="ch in settingsStore.channels" :key="ch" :label="ch" :value="ch" />
          </el-select>
        </div>
        <div class="form-field full-width">
          <label class="form-label">详细住址<span class="required">*</span></label>
          <input type="text" class="form-input" v-model="form.address" placeholder="请输入详细地址，如：XX小区X栋X单元X号">
        </div>
      </div>

      <div class="section-divider"></div>

      <div class="section-title">诉求信息</div>
      <div class="form-grid">
        <div class="form-field">
          <label class="form-label">问题分类<span class="required">*</span></label>
          <el-select v-model="form.problemCategory" class="form-select-el" placeholder="请选择问题分类">
            <el-option v-for="cat in settingsStore.serviceTypes" :key="cat" :label="cat" :value="cat" />
          </el-select>
        </div>
        <div class="form-field"></div>
        <div class="form-field full-width">
          <label class="form-label">问题描述<span class="required">*</span></label>
          <textarea class="form-textarea" v-model="form.problemDescription" placeholder="请详细描述客户遇到的问题，如：厨房水龙头漏水，已持续三天..."></textarea>
        </div>
        <div class="form-field full-width">
          <label class="form-label">接线员备注</label>
          <textarea class="form-textarea small" v-model="form.receiverRemark" placeholder="选填，可记录客户特殊要求或注意事项..."></textarea>
        </div>
      </div>
    </div>

    <div class="action-bar">
      <div class="action-bar-left">
        <button class="btn btn-secondary" @click="saveAsConsultation" :disabled="loading">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
          保存为咨询单
        </button>
      </div>
      <div class="action-bar-right">
        <button class="btn btn-primary" @click="submitOrder" :disabled="loading">
          <svg v-if="loading" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          提交工单
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/utils/api'
import { ElMessage } from 'element-plus'
import { useSettingsStore } from '@/stores/settings'

const router = useRouter()
const settingsStore = useSettingsStore()
const loading = ref(false)
const matchedCustomer = ref(null)
const phoneSearched = ref(false)

onMounted(() => {
  if (!settingsStore.loaded) settingsStore.fetchAll()
})

const form = ref({
  customerName: '',
  customerPhone: '',
  area: '',
  address: '',
  problemCategory: '',
  problemDescription: '',
  sourceChannel: '',
  receiverRemark: ''
})

function validate() {
  const f = form.value
  if (!f.customerName.trim()) { ElMessage.warning('请输入客户姓名'); return false }
  if (!f.customerPhone.trim()) { ElMessage.warning('请输入联系方式'); return false }
  if (!f.area) { ElMessage.warning('请选择区域'); return false }
  if (!f.address.trim()) { ElMessage.warning('请输入详细住址'); return false }
  if (!f.problemCategory) { ElMessage.warning('请选择问题分类'); return false }
  if (!f.problemDescription.trim()) { ElMessage.warning('请描述问题'); return false }
  return true
}

async function searchCustomer() {
  if (!form.value.customerPhone || form.value.customerPhone.length < 6) {
    phoneSearched.value = false
    matchedCustomer.value = null
    return
  }
  try {
    const response = await api.get('/customers', { params: { keyword: form.value.customerPhone } })
    const items = response.data.items || response.data || []
    if (items.length > 0) {
      matchedCustomer.value = items[0]
      form.value.customerName = items[0].name
      form.value.area = items[0].area || ''
      form.value.address = items[0].address || ''
    } else {
      matchedCustomer.value = null
    }
  } catch (e) {
    matchedCustomer.value = null
  } finally {
    phoneSearched.value = true
  }
}

async function doSubmit(status) {
  if (!validate()) return
  loading.value = true
  try {
    const payload = { ...form.value, status }
    const response = await api.post('/orders', payload)
    return response.data
  } catch (error) {
    ElMessage.error('操作失败，请重试')
    return null
  } finally {
    loading.value = false
  }
}

async function saveAsConsultation() {
  const data = await doSubmit('consultation')
  if (data) {
    ElMessage.success('已保存为咨询单')
    router.push('/orders')
  }
}

async function submitOrder() {
  const data = await doSubmit('pending')
  if (data) {
    ElMessage.success('工单提交成功')
    router.push(`/orders/${data.id || data.orderId}`)
  }
}

async function submitAndDispatch() {
  const data = await doSubmit('pending')
  if (data) {
    ElMessage.success('工单提交成功，请进行派单')
    router.push(`/orders/${data.id || data.orderId}?dispatch=1`)
  }
}
</script>

<style scoped lang="scss">
.order-create-page {
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

.btn-cancel {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 36px;
  padding: 0 20px;
  border-radius: 999px;
  border: 1.5px solid var(--border);
  background: transparent;
  color: var(--muted-fg);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-cancel:hover {
  border-color: var(--muted-fg);
  color: var(--fg);
  background: rgba(222,216,207,0.15);
}

.form-card {
  background: var(--card-bg);
  border-radius: 24px;
  border: 1px solid rgba(222, 216, 207, 0.4);
  box-shadow: var(--shadow-soft);
  padding: 32px;
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

.section-divider {
  height: 1px;
  background: rgba(222, 216, 207, 0.4);
  margin: 32px 0;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.form-grid .full-width {
  grid-column: 1 / -1;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 13px;
  color: #5C5A4E;
}
.form-label .required {
  color: var(--destructive);
  margin-left: 2px;
}

.form-input,
.form-select {
  width: 100%;
  height: 40px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid rgba(222,216,207,0.8);
  background: rgba(255,255,255,0.5);
  font-family: var(--font-body);
  font-weight: 400;
  font-size: 14px;
  color: var(--fg);
  outline: none;
  transition: all 0.2s ease;
  -webkit-appearance: none;
  appearance: none;
}
.form-input::placeholder {
  color: var(--muted-fg);
  opacity: 0.6;
}
.form-input:focus,
.form-select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(74, 127, 181, 0.15);
  background: rgba(255, 255, 255, 0.75);
}
.form-select {
  background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%2378786C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 18px center;
  padding-right: 44px;
  cursor: pointer;
}

.form-textarea {
  width: 100%;
  height: 100px;
  padding: 12px 16px;
  border-radius: 16px;
  border: 1px solid rgba(222,216,207,0.8);
  background: rgba(255,255,255,0.5);
  font-family: var(--font-body);
  font-weight: 400;
  font-size: 14px;
  color: var(--fg);
  outline: none;
  resize: vertical;
  min-height: 80px;
  line-height: 1.6;
  transition: all 0.2s ease;
  -webkit-appearance: none;
  appearance: none;
}
.form-textarea::placeholder {
  color: var(--muted-fg);
  opacity: 0.6;
}
.form-textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(74, 127, 181, 0.15);
  background: rgba(255, 255, 255, 0.75);
}
.form-textarea.small {
  height: 80px;
  min-height: 60px;
}

.customer-match-area {
  margin-top: 8px;
}

.match-found {
  background: rgba(74, 127, 181, 0.08);
  border-radius: 12px;
  padding: 12px 16px;
  border: 1px solid rgba(74, 127, 181, 0.2);
}

.match-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.match-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--primary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.vip-badge {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(232,184,75,0.15);
  color: #B8922E;
  font-weight: 600;
  font-size: 12px;
}

.blacklist-badge {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(212,114,106,0.1);
  color: var(--destructive);
  font-weight: 600;
  font-size: 12px;
}

.match-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  font-size: 12px;
  color: var(--muted-fg);
}
.match-info strong {
  color: var(--fg);
}
.match-info .full-width {
  grid-column: 1 / -1;
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
  color: var(--accent-fg, #4A4A40);
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
  border-radius: 12px;
  padding: 12px 16px;
  border: 1px solid rgba(232, 184, 75, 0.2);
  font-size: 13px;
  font-weight: 500;
  color: #9A7A1F;
  display: flex;
  align-items: center;
  gap: 6px;
}

.action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0 4px;
}

.action-bar-left,
.action-bar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 28px;
  border-radius: 999px;
  border: none;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

.btn-secondary {
  background: var(--muted, #F0EBE5);
  color: var(--accent-fg, #4A4A40);
}
.btn-secondary:hover:not(:disabled) {
  background: var(--accent, #E6DCCD);
}

.btn-primary {
  background: var(--primary);
  color: var(--primary-fg, #FFFFFF);
  box-shadow: 0 4px 14px -2px rgba(74, 127, 181, 0.35);
}
.btn-primary:hover:not(:disabled) {
  background: #3F6FA0;
  box-shadow: 0 6px 20px -2px rgba(74, 127, 181, 0.4);
  transform: translateY(-1px);
}
.btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.spin { animation: spin 1s linear infinite; }

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  .form-grid .full-width {
    grid-column: 1;
  }
  .form-card {
    padding: 20px;
  }
  .action-bar {
    flex-direction: column-reverse;
    gap: 12px;
  }
  .action-bar-left,
  .action-bar-right {
    width: 100%;
    justify-content: center;
  }
}
</style>
