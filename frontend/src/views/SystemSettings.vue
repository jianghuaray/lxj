<template>
  <div class="system-page">
    <div class="page-header">
      <h1 class="page-title">系统设置</h1>
    </div>

    <!-- System Tabs -->
    <div class="system-tabs">
      <button class="system-tab" :class="{ active: activeTab === 'users' }" @click="activeTab = 'users'">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
        用户管理
      </button>
      <button class="system-tab" :class="{ active: activeTab === 'baseData' }" @click="activeTab = 'baseData'">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>
        基础数据管理
      </button>
    </div>

    <!-- ===== Tab 1: User Management ===== -->
    <div v-if="activeTab === 'users'" class="tab-panel active" id="panel-users">
      <!-- Action Bar -->
      <div style="display:flex;justify-content:flex-end;margin-bottom:16px;">
        <button class="btn-pill" @click="showUserDialog()">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
          添加用户
        </button>
      </div>

      <!-- User Table -->
      <div class="table-container">
        <table class="data-table user-table">
          <colgroup>
            <col class="col-username">
            <col class="col-name">
            <col class="col-role">
            <col class="col-status">
            <col class="col-login">
            <col class="col-action">
          </colgroup>
          <thead>
            <tr>
              <th>用户名</th>
              <th>姓名</th>
              <th>角色</th>
              <th>状态</th>
              <th>最后登录</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td style="font-weight:600;">{{ user.username }}</td>
              <td>{{ user.realName }}</td>
              <td>
                <span class="status-badge" :class="`role-${user.role}`">{{ user.role === 'admin' ? '管理员' : '接线员' }}</span>
              </td>
              <td>
                <span class="status-badge" :class="user.status === 1 ? 'enabled' : 'disabled'">{{ user.status === 1 ? '启用' : '停用' }}</span>
              </td>
              <td>{{ formatDate(user.lastLoginAt) }}</td>
              <td>
                <button class="action-btn" @click="showUserDialog(user)">编辑</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ===== Tab 2: Basic Data Management ===== -->
    <div v-if="activeTab === 'baseData'" class="tab-panel active" id="panel-basedata">
      <div class="data-cards-grid">
        <!-- Service Types -->
        <div class="data-card">
          <div class="data-card-header">
            <span class="data-card-title">服务类型管理</span>
            <button class="data-card-edit-btn" @click="openAddDialog('serviceTypes')">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
              编辑
            </button>
          </div>
          <div class="data-card-list">
            <div v-for="item in serviceTypes" :key="item" class="data-list-item">
              <span>{{ item }}</span>
              <div class="data-list-actions">
                <button class="action-btn muted-action" @click="openEditDialog('serviceTypes', item)">编辑</button>
                <button class="action-btn danger" @click="removeItem('serviceTypes', item)">删除</button>
              </div>
            </div>
            <div v-if="serviceTypes.length === 0" class="empty-hint">暂无数据，点击右上角添加</div>
          </div>
        </div>

        <!-- Area Management -->
        <div class="data-card">
          <div class="data-card-header">
            <span class="data-card-title">区域管理</span>
            <button class="data-card-edit-btn" @click="openAddDialog('areaList')">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
              编辑
            </button>
          </div>
          <div class="data-card-list">
            <div v-for="item in areaList" :key="item" class="data-list-item">
              <span>{{ item }}</span>
              <div class="data-list-actions">
                <button class="action-btn muted-action" @click="openEditDialog('areaList', item)">编辑</button>
                <button class="action-btn danger" @click="removeItem('areaList', item)">删除</button>
              </div>
            </div>
            <div v-if="areaList.length === 0" class="empty-hint">暂无数据，点击右上角添加</div>
          </div>
        </div>

        <!-- Source Channel Management -->
        <div class="data-card">
          <div class="data-card-header">
            <span class="data-card-title">来源渠道管理</span>
            <button class="data-card-edit-btn" @click="openAddDialog('sourceChannels')">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
              编辑
            </button>
          </div>
          <div class="data-card-list">
            <div v-for="item in sourceChannels" :key="item" class="data-list-item">
              <span>{{ item }}</span>
              <div class="data-list-actions">
                <button class="action-btn muted-action" @click="openEditDialog('sourceChannels', item)">编辑</button>
                <button class="action-btn danger" @click="removeItem('sourceChannels', item)">删除</button>
              </div>
            </div>
            <div v-if="sourceChannels.length === 0" class="empty-hint">暂无数据，点击右上角添加</div>
          </div>
        </div>

        <!-- Cancel Reason Management -->
        <div class="data-card">
          <div class="data-card-header">
            <span class="data-card-title">取消原因管理</span>
            <button class="data-card-edit-btn" @click="openAddDialog('cancelReasons')">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
              编辑
            </button>
          </div>
          <div class="data-card-list">
            <div v-for="item in cancelReasons" :key="item" class="data-list-item">
              <span>{{ item }}</span>
              <div class="data-list-actions">
                <button class="action-btn muted-action" @click="openEditDialog('cancelReasons', item)">编辑</button>
                <button class="action-btn danger" @click="removeItem('cancelReasons', item)">删除</button>
              </div>
            </div>
            <div v-if="cancelReasons.length === 0" class="empty-hint">暂无数据，点击右上角添加</div>
          </div>
        </div>
      </div>
    </div>

    <!-- User Dialog -->
    <el-dialog v-model="userDialogVisible" :title="editingUser ? '编辑用户' : '新增用户'" width="500px">
      <el-form :model="userForm" label-position="top">
        <el-form-item label="用户名">
          <el-input v-model="userForm.username" :disabled="!!editingUser" />
        </el-form-item>
        <el-form-item label="真实姓名">
          <el-input v-model="userForm.realName" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="userForm.role" class="form-select-el">
            <el-option label="管理员" value="admin" />
            <el-option label="接线员" value="operator" />
          </el-select>
        </el-form-item>
        <el-form-item label="密码" v-if="!editingUser">
          <el-input v-model="userForm.password" type="password" placeholder="设置密码" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="userForm.status" class="form-select-el">
            <el-option label="启用" :value="1" />
            <el-option label="停用" :value="0" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="userDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveUser" :loading="userSaving">确定</el-button>
      </template>
    </el-dialog>

    <!-- Base Data Edit Dialog -->
    <el-dialog v-model="baseDataDialogVisible" :title="baseDataDialogTitle" width="420px">
      <el-form :model="baseDataForm" label-position="top">
        <el-form-item :label="baseDataLabel">
          <el-input v-model="baseDataForm.name" placeholder="请输入名称" @keyup.enter="saveBaseDataItem" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="baseDataDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveBaseDataItem" :loading="baseDataSaving">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import api from '@/utils/api'
import { ElMessage } from 'element-plus'
import { formatDate } from '@/utils/format'

const activeTab = ref('users')
const users = ref([])

const serviceTypes = ref([])
const areaList = ref([])
const sourceChannels = ref([])
const cancelReasons = ref([])

// Base data dialog state
const baseDataDialogVisible = ref(false)
const baseDataSaving = ref(false)
const baseDataType = ref('')       // which list is being edited
const baseDataOldName = ref('')    // old name (for edit mode, empty = add mode)
const baseDataForm = ref({ name: '' })
const baseDialogTitle = ref('')
const baseDataLabel = ref('')

// Category display config
const categoryConfig = {
  serviceTypes: { label: '服务类型', title: '添加服务类型', apiPath: 'service-types' },
  areaList:      { label: '区域',     title: '添加区域',     apiPath: 'areas' },
  sourceChannels: { label: '渠道',    title: '添加渠道',     apiPath: 'channels' },
  cancelReasons:  { label: '取消原因', title: '添加取消原因', apiPath: 'cancel-reasons' }
}

const userDialogVisible = ref(false)
const editingUser = ref(null)
const userSaving = ref(false)
const userForm = ref({ username: '', realName: '', role: 'operator', password: '', status: 1 })

function showUserDialog(user = null) {
  editingUser.value = user
  if (user) {
    userForm.value = { ...user }
  } else {
    userForm.value = { username: '', realName: '', role: 'operator', password: '', status: 1 }
  }
  userDialogVisible.value = true
}

async function saveUser() {
  userSaving.value = true
  try {
    if (editingUser.value) {
      await api.patch(`/users/${editingUser.value.id}`, userForm.value)
      ElMessage.success('更新成功')
    } else {
      await api.post('/users', userForm.value)
      ElMessage.success('添加成功')
    }
    userDialogVisible.value = false
    await fetchUsers()
  } catch (error) {
    ElMessage.error('操作失败')
  } finally {
    userSaving.value = false
  }
}

async function resetPassword(user) {
  try {
    await api.patch(`/users/${user.id}/reset-password`, { newPassword: '123456' })
    ElMessage.success('密码已重置为默认密码 123456')
  } catch (error) {
    ElMessage.error('重置失败')
  }
}

// Base data API mapping
const apiMap = {
  serviceTypes: { list: '/settings/service-types', add: '/settings/service-types', remove: '/settings/service-types' },
  areaList: { list: '/settings/areas', add: '/settings/areas', remove: '/settings/areas' },
  sourceChannels: { list: '/settings/channels', add: '/settings/channels', remove: '/settings/channels' },
  cancelReasons: { list: '/settings/cancel-reasons', add: '/settings/cancel-reasons', remove: '/settings/cancel-reasons' }
}

const listRefMap = { serviceTypes, areaList, sourceChannels, cancelReasons }

async function removeItem(listName, item) {
  try {
    await api.delete(`${apiMap[listName].remove}/${encodeURIComponent(item)}`)
    ElMessage.success('删除成功')
    await fetchBaseData(listName)
  } catch (error) {
    ElMessage.error('删除失败')
  }
}

async function fetchBaseData(listName) {
  try {
    const response = await api.get(apiMap[listName].list)
    listRefMap[listName].value = response.data.items || response.data || []
  } catch (error) {
    console.error(`获取${listName}失败`)
  }
}

async function fetchAllBaseData() {
  await Promise.all([
    fetchBaseData('serviceTypes'),
    fetchBaseData('areaList'),
    fetchBaseData('sourceChannels'),
    fetchBaseData('cancelReasons')
  ])
}

async function fetchUsers() {
  try {
    const response = await api.get('/users')
    users.value = response.data.items || response.data || []
  } catch (error) {
    console.error('获取用户列表失败')
  }
}

// Base data dialog methods
function openAddDialog(listName) {
  const config = categoryConfig[listName]
  baseDataType.value = listName
  baseDataOldName.value = ''  // add mode
  baseDataForm.value.name = ''
  baseDialogTitle.value = config.title
  baseDataLabel.value = config.label
  baseDataDialogVisible.value = true
}

function openEditDialog(listName, item) {
  const config = categoryConfig[listName]
  baseDataType.value = listName
  baseDataOldName.value = item  // edit mode
  baseDataForm.value.name = item
  baseDialogTitle.value = `编辑${config.label}`
  baseDataLabel.value = config.label
  baseDataDialogVisible.value = true
}

async function saveBaseDataItem() {
  const val = baseDataForm.value.name.trim()
  if (!val) {
    ElMessage.warning('请输入名称')
    return
  }

  const config = categoryConfig[baseDataType.value]
  const apiPath = config.apiPath
  baseDataSaving.value = true

  try {
    if (baseDataOldName.value) {
      // Edit mode: PUT
      await api.put(`/settings/${apiPath}/${encodeURIComponent(baseDataOldName.value)}`, { name: val })
      ElMessage.success('修改成功')
    } else {
      // Add mode: POST
      await api.post(`/settings/${apiPath}`, { name: val })
      ElMessage.success('添加成功')
    }
    baseDataDialogVisible.value = false
    await fetchBaseData(baseDataType.value)
  } catch (error) {
    const msg = error?.response?.data?.error || (baseDataOldName.value ? '修改失败' : '添加失败')
    ElMessage.error(msg)
  } finally {
    baseDataSaving.value = false
  }
}

// 添加一些新方法（保留兼容）
function addItemDialog(listName) {
  openAddDialog(listName)
}

function editItem(listName, item) {
  openEditDialog(listName, item)
}

onMounted(() => {
  fetchUsers()
  fetchAllBaseData()
})
</script>

<style scoped lang="scss">
.system-page { position: relative; z-index: 1; }
.page-header { margin-bottom: 20px; }
.page-title { font-family: var(--font-display); font-weight: 700; font-size: 24px; color: var(--fg); margin: 0; }

/* ===== System Tabs ===== */
.system-tabs { display: flex; gap: 8px; margin-bottom: 20px; }
.system-tab { display: inline-flex; align-items: center; gap: 6px; padding: 9px 22px; border-radius: 999px; border: none; background: transparent; color: var(--muted-fg); font-family: var(--font-body); font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.3s ease; white-space: nowrap; }
.system-tab:hover { background: rgba(230,220,205,0.3); }
.system-tab.active { background: var(--primary); color: white; box-shadow: var(--shadow-soft); }
.system-tab svg { width: 16px; height: 16px; stroke-width: 2; }
.tab-panel { display: none; }
.tab-panel.active { display: block; }

/* ===== Pill Buttons ===== */
.btn-pill { display: inline-flex; align-items: center; gap: 6px; padding: 10px 24px; border-radius: 999px; border: none; background: var(--primary); color: white; font-family: var(--font-body); font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: var(--shadow-soft); transition: all 0.3s ease; }
.btn-pill:hover { transform: scale(1.05); box-shadow: var(--shadow-hover); }
.btn-pill:active { transform: scale(0.95); }
.btn-pill svg { width: 18px; height: 18px; stroke-width: 2; }

/* ===== Data Table ===== */
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

/* ===== Status Badges ===== */
.status-badge { display: inline-flex; align-items: center; padding: 4px 14px; border-radius: 999px; font-size: 12px; font-weight: 600; white-space: nowrap; }
.status-badge.enabled { background: rgba(74,127,181,0.12); color: #4A7FB5; }
.status-badge.disabled { background: rgba(212,114,106,0.1); color: #D4726A; }
.status-badge.role-admin { background: rgba(147,112,219,0.12); color: #7B5EA7; }
.status-badge.role-operator { background: rgba(74,127,181,0.12); color: #4A7FB5; }
/* Operation type badges */
.status-badge.type-create { background: rgba(74,127,181,0.12); color: #4A7FB5; }
.status-badge.type-dispatch { background: rgba(232,184,75,0.15); color: #B8922E; }
.status-badge.type-complete { background: rgba(74,140,100,0.12); color: #4A8C64; }
.status-badge.type-callback { background: rgba(74,180,180,0.12); color: #3A8A8A; }
.status-badge.type-cancel { background: rgba(212,114,106,0.1); color: #D4726A; }

/* ===== Action Buttons ===== */
.action-btn { background: none; border: none; color: var(--primary); font-family: var(--font-body); font-size: 13px; font-weight: 500; cursor: pointer; padding: 4px 8px; border-radius: 8px; transition: all 0.3s ease; }
.action-btn:hover { background: rgba(74,127,181,0.08); color: #3D6A9A; }
.action-btn + .action-btn { margin-left: 4px; }
.action-btn.danger { color: var(--destructive); }
.action-btn.danger:hover { background: rgba(212,114,106,0.08); }
.action-btn.muted-action { color: var(--muted-fg); }
.action-btn.muted-action:hover { background: rgba(120,120,108,0.08); color: var(--fg); }

/* ===== Basic Data Cards ===== */
.data-cards-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.data-card { background: var(--card-bg); border: 1px solid rgba(222,216,207,0.5); box-shadow: var(--shadow-soft); overflow: hidden; transition: all 0.3s ease; }
.data-card:nth-child(1) { border-radius: 24px 16px 24px 16px; }
.data-card:nth-child(2) { border-radius: 16px 24px 16px 24px; }
.data-card:nth-child(3) { border-radius: 24px 24px 16px 16px; }
.data-card:nth-child(4) { border-radius: 16px 16px 24px 24px; }
.data-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-hover); }
.data-card-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px 12px; }
.data-card-title { font-family: var(--font-display); font-weight: 700; font-size: 15px; color: var(--fg); }
.data-card-edit-btn { background: none; border: none; color: var(--primary); cursor: pointer; padding: 4px; border-radius: 8px; transition: all 0.3s ease; display: flex; align-items: center; gap: 4px; font-family: var(--font-body); font-size: 12px; font-weight: 500; }
.data-card-edit-btn:hover { background: rgba(74,127,181,0.08); }
.data-card-edit-btn svg { width: 14px; height: 14px; stroke-width: 2; }
.data-card-list { padding: 0 20px 16px; }
.data-list-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(222,216,207,0.3); font-size: 13px; color: var(--fg); }
.data-list-item:last-child { border-bottom: none; }
.data-list-item.add-new { border-bottom: none; padding-top: 16px; }
.data-list-actions { display: flex; gap: 4px; }
.empty-hint { padding: 24px 0; text-align: center; color: var(--muted-fg); font-size: 13px; }

/* ===== Filter Toolbar ===== */
.filter-toolbar { background: rgba(240,235,229,0.5); border-radius: 24px; padding: 14px 20px; display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.filter-select { height: 40px; border-radius: 999px; border: 1px solid rgba(222,216,207,0.8); background: rgba(255,255,255,0.5); padding: 0 16px; font-family: var(--font-body); font-size: 14px; color: var(--fg); outline: none; cursor: pointer; transition: all 0.2s ease; appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%2378786C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; padding-right: 36px; }
.filter-select:focus { box-shadow: 0 0 0 3px rgba(74,127,181,0.15); border-color: var(--primary); }

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
.filter-input { height: 40px; border-radius: 999px; border: 1px solid rgba(222,216,207,0.8); background: rgba(255,255,255,0.5); padding: 0 16px; font-family: var(--font-body); font-size: 14px; color: var(--fg); outline: none; transition: all 0.2s ease; }
.filter-input::placeholder { color: var(--muted-fg); opacity: 0.7; }
.filter-input:focus { box-shadow: 0 0 0 3px rgba(74,127,181,0.15); border-color: var(--primary); background: rgba(255,255,255,0.8); }
.btn-query { height: 36px; padding: 0 20px; border-radius: 999px; border: 1.5px solid var(--primary); background: var(--primary); color: white; font-family: var(--font-body); font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: var(--shadow-soft); transition: all 0.2s ease; white-space: nowrap; }
.btn-query:hover { background: #3D6FA0; border-color: #3D6FA0; box-shadow: var(--shadow-soft); }

/* ===== Form elements in dialogs ===== */
.form-select-el {
  width: 100% !important;
  :deep(.el-select__wrapper) {
    border-radius: 12px !important;
    min-height: 40px !important;
    height: 40px !important;
    background: rgba(255,255,255,0.8) !important;
    box-shadow: 0 0 0 1px var(--border) !important;
    display: flex !important;
    align-items: center !important;
  }
}
:deep(.el-dialog) { border-radius: 20px; overflow: hidden; }
:deep(.el-dialog__header) { padding: 20px 24px 16px; margin: 0; border-bottom: 1px solid rgba(222,216,207,0.3); }
:deep(.el-dialog__title) { font-family: var(--font-display); font-weight: 700; font-size: 17px; color: var(--fg); }
:deep(.el-dialog__body) { padding: 20px 24px; }
:deep(.el-dialog__footer) { padding: 12px 24px 20px; border-top: 1px solid rgba(222,216,207,0.3); }
:deep(.el-form-item__label) { font-size: 13px; color: var(--muted-fg); font-weight: 500; padding-bottom: 6px; }

/* ===== User table column widths ===== */
.user-table { table-layout: fixed; }
.user-table col.col-username { width: 15%; }
.user-table col.col-name { width: 12%; }
.user-table col.col-role { width: 12%; }
.user-table col.col-status { width: 10%; }
.user-table col.col-login { width: 18%; }
.user-table col.col-action { width: 10%; }

/* ===== Form elements in dialog ===== */
.form-select-el {
  width: 100% !important;
  :deep(.el-select__wrapper) {
    border-radius: 12px !important;
    min-height: 40px !important;
    height: 40px !important;
    background: rgba(255,255,255,0.8) !important;
    box-shadow: 0 0 0 1px var(--border) !important;
    display: flex !important;
    align-items: center !important;
  }
}
:deep(.el-dialog) { border-radius: 20px; overflow: hidden; }
:deep(.el-dialog__header) { padding: 20px 24px 16px; margin: 0; border-bottom: 1px solid rgba(222,216,207,0.3); }
:deep(.el-dialog__title) { font-family: var(--font-display); font-weight: 700; font-size: 17px; color: var(--fg); }
:deep(.el-dialog__body) { padding: 20px 24px; }
:deep(.el-dialog__footer) { padding: 12px 24px 20px; border-top: 1px solid rgba(222,216,207,0.3); }
:deep(.el-form-item__label) { font-size: 13px; color: var(--muted-fg); font-weight: 500; padding-bottom: 6px; }

/* ===== User table column widths ===== */
.user-table { table-layout: fixed; }
.user-table col.col-username { width: 15%; }
.user-table col.col-name { width: 12%; }
.user-table col.col-role { width: 12%; }
.user-table col.col-status { width: 10%; }
.user-table col.col-login { width: 18%; }
.user-table col.col-action { width: 10%; }

@media (max-width: 900px) {
  .data-cards-grid { grid-template-columns: 1fr; }
}
</style>
