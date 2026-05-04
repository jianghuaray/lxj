<template>
  <div class="app-layout">
    <!-- 侧边栏 -->
    <aside class="sidebar">
      <div class="sidebar-logo">
        <div class="logo-wrap">
          <img src="/logo.png" alt="乐修匠" class="logo-img" />
        </div>
        <div class="logo-text">
          <h1 class="brand">乐修匠</h1>
          <p class="sub">社区维修管理系统</p>
        </div>
      </div>
      <nav class="sidebar-nav">
        <router-link
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
        >
          <component :is="item.icon" class="nav-icon" />
          <span>{{ item.title }}</span>
        </router-link>
      </nav>
      <div class="sidebar-footer">v3.0.0</div>
    </aside>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 顶部栏 -->
      <header class="topbar">
        <div class="breadcrumb">
          <span class="bc-home">首页</span>
          <span class="sep">/</span>
          <span class="current">{{ currentPageTitle }}</span>
        </div>
        <div class="topbar-spacer"></div>
        <div class="topbar-right">
          <button class="notification-btn" @click="showNotifications = !showNotifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <span class="badge" v-if="unreadCount > 0"></span>
          </button>
          <el-dropdown @command="handleCommand">
            <div class="user-info">
              <div class="user-avatar">{{ userInitial }}</div>
              <span class="user-name">{{ authStore.user?.realName }}</span>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <!-- 页面内容 -->
      <main class="page-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  Document,
  User,
  Tools,
  DataAnalysis,
  Money,
  Setting
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const showNotifications = ref(false)
const unreadCount = ref(0)

const menuItems = [
  { path: '/dashboard', title: '数据看板', icon: DataAnalysis },
  { path: '/orders', title: '工单管理', icon: Document },
  { path: '/customers', title: '客户管理', icon: User },
  { path: '/technicians', title: '师傅管理', icon: Tools },
  { path: '/fees', title: '维修费用', icon: Money },
  { path: '/system', title: '系统设置', icon: Setting }
]

const currentPageTitle = computed(() => {
  const current = menuItems.find(item => route.path.startsWith(item.path))
  return current?.title || '数据看板'
})

const userInitial = computed(() => {
  const name = authStore.user?.realName || 'U'
  return name.charAt(0)
})

function isActive(path) {
  return route.path.startsWith(path)
}

function handleCommand(command) {
  if (command === 'logout') {
    authStore.logout()
    router.push('/login')
  }
}
</script>

<style scoped lang="scss">
.app-layout {
  display: flex;
  height: 100vh;
  position: relative;
  z-index: 1;
}

// 侧边栏
.sidebar {
  width: 220px;
  min-width: 220px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: rgba(253, 252, 248, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-right: 1px solid rgba(222, 216, 207, 0.5);
  z-index: 10;
  position: relative;
  overflow: hidden;
}

.sidebar-logo {
  padding: 24px 20px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid rgba(222, 216, 207, 0.3);
  margin-bottom: 8px;
}

.logo-wrap {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.logo-img {
  height: 36px;
  width: auto;
}

.logo-text {
  display: flex;
  flex-direction: column;
}

.brand {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 18px;
  color: var(--fg);
  margin: 0;
  line-height: 1.2;
}

.sub {
  font-family: var(--font-body);
  font-weight: 400;
  font-size: 11px;
  color: var(--muted-fg);
  margin: 0;
  line-height: 1.3;
}

.sidebar-nav {
  flex: 1;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 44px;
  padding: 0 14px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  color: var(--muted-fg);
  font-size: 14px;
  font-weight: 500;
  position: relative;
}

.nav-item:hover {
  background: rgba(230, 220, 205, 0.3);
  color: var(--fg);
}

.nav-item.active {
  background: rgba(74, 127, 181, 0.1);
  color: var(--primary);
  font-weight: 600;
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  background: var(--primary);
  border-radius: 0 3px 3px 0;
}

.nav-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.sidebar-footer {
  padding: 16px 20px;
  font-size: 11px;
  color: var(--muted-fg);
  border-top: 1px solid rgba(222, 216, 207, 0.3);
  text-align: center;
}

// 主内容区
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.main-content::before {
  content: '';
  position: absolute;
  top: -60px;
  right: -40px;
  width: 200px;
  height: 200px;
  background: var(--primary);
  border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
  filter: blur(80px);
  opacity: 0.06;
  pointer-events: none;
  z-index: 0;
}

.main-content::after {
  content: '';
  position: absolute;
  bottom: -40px;
  left: -30px;
  width: 160px;
  height: 160px;
  background: var(--secondary);
  border-radius: 40% 60% 70% 30% / 40% 70% 30% 60%;
  filter: blur(60px);
  opacity: 0.05;
  pointer-events: none;
  z-index: 0;
}

// 顶部栏
.topbar {
  height: 56px;
  min-height: 56px;
  display: flex;
  align-items: center;
  padding: 0 28px;
  gap: 16px;
  background: rgba(253, 252, 248, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(222, 216, 207, 0.3);
  z-index: 5;
  position: relative;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--muted-fg);
}

.bc-home {
  opacity: 0.5;
}

.sep {
  opacity: 0.5;
}

.current {
  color: var(--fg);
  font-weight: 600;
}

.topbar-spacer {
  flex: 1;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.notification-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted-fg);
  transition: all 0.3s ease;
  position: relative;
}
.notification-btn:hover {
  background: rgba(230, 220, 205, 0.3);
  color: var(--fg);
}

.badge {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--destructive);
  border: 2px solid var(--bg);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 14px;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--fg);
}

// 页面内容
.page-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 28px 20px;
  position: relative;
  z-index: 1;
}
</style>
