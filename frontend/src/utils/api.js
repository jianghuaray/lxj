import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'
import { useAuthStore } from '@/stores/auth'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
})

// 防止相同错误消息短时间内重复弹出
let lastErrorMsg = ''
let lastErrorTime = 0
const ERROR_DEDUPE_MS = 2000

function showError(msg) {
  const now = Date.now()
  if (msg === lastErrorMsg && now - lastErrorTime < ERROR_DEDUPE_MS) return
  lastErrorMsg = msg
  lastErrorTime = now
  ElMessage.error(msg)
}

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 区分错误类型给用户更友好的提示
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 请求被主动取消，不提示
    if (axios.isCancel(error)) {
      return Promise.reject(error)
    }

    if (!error.response) {
      // 网络错误或超时
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        showError('请求超时，请检查网络后重试')
      } else {
        showError('网络连接失败，请检查网络设置')
      }
    } else {
      const { status, data } = error.response
      switch (status) {
        case 401:
          showError('登录已过期，请重新登录')
          // 通过 store 统一处理登出，保持 Store 与 localStorage 同步
          try {
            const authStore = useAuthStore()
            authStore.logout()
          } catch (e) {
            // store 未初始化时降级处理
            localStorage.removeItem('token')
            localStorage.removeItem('user')
          }
          router.push('/login')
          break
        case 403:
          showError('没有权限执行此操作')
          break
        case 404:
          showError(data?.error || '请求的资源不存在')
          break
        case 422:
          showError(data?.error || '提交数据验证失败')
          break
        case 500:
          showError('服务器内部错误，请稍后重试')
          break
        default:
          showError(data?.error || '请求失败')
      }
    }
    return Promise.reject(error)
  }
)

/**
 * Create an AbortController-based cancel token for component use
 * Usage: const { signal, cancel } = createCancelToken()
 *        api.get('/url', { signal })
 *        onUnmounted(() => cancel())
 */
export function createCancelToken() {
  const controller = new AbortController()
  return {
    signal: controller.signal,
    cancel: (reason) => controller.abort(reason)
  }
}

export default api
