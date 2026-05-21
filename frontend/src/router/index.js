import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/Login.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      name: 'layout',
      component: () => import('@/layouts/MainLayout.vue'),
      redirect: '/dashboard',
      meta: { requiresAuth: true },
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/Dashboard.vue'),
          meta: { title: '数据看板' }
        },
        {
          path: 'orders',
          name: 'orders',
          component: () => import('@/views/orders/OrderList.vue'),
          meta: { title: '工单管理' }
        },
        {
          path: 'orders/create',
          name: 'order-create',
          component: () => import('@/views/orders/OrderCreate.vue'),
          meta: { title: '创建工单' }
        },
        {
          path: 'orders/:id',
          name: 'order-detail',
          component: () => import('@/views/orders/OrderDetail.vue'),
          meta: { title: '工单详情' }
        },
        {
          path: 'customers',
          name: 'customers',
          component: () => import('@/views/CustomerList.vue'),
          meta: { title: '客户管理' }
        },
        {
          path: 'customers/add',
          name: 'customer-add',
          component: () => import('@/views/CustomerAdd.vue'),
          meta: { title: '新增客户' }
        },
        {
          path: 'customers/edit/:id',
          name: 'customer-edit',
          component: () => import('@/views/CustomerAdd.vue'),
          meta: { title: '编辑客户' }
        },
        {
          path: 'customers/:id',
          name: 'customer-detail',
          component: () => import('@/views/CustomerDetail.vue'),
          meta: { title: '客户档案' }
        },
        {
          path: 'technicians',
          name: 'technicians',
          component: () => import('@/views/TechnicianList.vue'),
          meta: { title: '师傅管理' }
        },
        {
          path: 'technicians/add',
          name: 'technician-add',
          component: () => import('@/views/TechnicianAdd.vue'),
          meta: { title: '添加师傅' }
        },
        {
          path: 'technicians/edit/:id',
          name: 'technician-edit',
          component: () => import('@/views/TechnicianAdd.vue'),
          meta: { title: '编辑师傅' }
        },
        {
          path: 'volunteers',
          name: 'volunteers',
          component: () => import('@/views/VolunteerList.vue'),
          meta: { title: '志愿者管理' }
        },
        {
          path: 'volunteers/add',
          name: 'volunteer-add',
          component: () => import('@/views/VolunteerAdd.vue'),
          meta: { title: '新增志愿者' }
        },
        {
          path: 'volunteers/edit/:id',
          name: 'volunteer-edit',
          component: () => import('@/views/VolunteerAdd.vue'),
          meta: { title: '编辑志愿者' }
        },
        {
          path: 'volunteers/:id',
          name: 'volunteer-detail',
          component: () => import('@/views/VolunteerDetail.vue'),
          meta: { title: '志愿者档案' }
        },
        {
          path: 'fees',
          name: 'fees',
          component: () => import('@/views/FeeList.vue'),
          meta: { title: '维修费用' }
        },
        {
          path: 'system',
          name: 'system',
          component: () => import('@/views/SystemSettings.vue'),
          meta: { title: '系统设置', requireAdmin: true }
        }
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFound.vue'),
      meta: { requiresAuth: false }
    }
  ]
})

// Route loading progress bar
let loadingTimer = null
let routeLoading = false

function showRouteLoading() {
  if (routeLoading) return
  routeLoading = true
  // Use NProgress-like approach with a simple CSS bar
  let bar = document.getElementById('route-loading-bar')
  if (!bar) {
    bar = document.createElement('div')
    bar.id = 'route-loading-bar'
    bar.style.cssText = 'position:fixed;top:0;left:0;height:3px;background:var(--primary,#4A7FB5);z-index:99999;transition:width 0.3s ease;width:0;'
    document.body.appendChild(bar)
  }
  bar.style.width = '0'
  bar.style.opacity = '1'
  // Animate to 60% quickly
  requestAnimationFrame(() => {
    bar.style.width = '60%'
  })
}

function hideRouteLoading() {
  routeLoading = false
  const bar = document.getElementById('route-loading-bar')
  if (!bar) return
  bar.style.width = '100%'
  setTimeout(() => {
    bar.style.opacity = '0'
    setTimeout(() => {
      if (bar.parentNode) bar.parentNode.removeChild(bar)
    }, 300)
  }, 200)
}

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  // Show loading bar for route transitions
  if (to.path !== from.path) {
    showRouteLoading()
  }

  // Auth check
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
    hideRouteLoading()
    return
  }

  // Redirect logged-in users away from login page
  if (to.path === '/login' && authStore.isAuthenticated) {
    next('/')
    hideRouteLoading()
    return
  }

  // Admin-only routes
  if (to.meta.requireAdmin && authStore.user?.role !== 'admin') {
    next('/dashboard')
    hideRouteLoading()
    return
  }

  next()
})

router.afterEach(() => {
  hideRouteLoading()
})

router.onError(() => {
  hideRouteLoading()
})

export default router
