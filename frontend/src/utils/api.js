import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
})

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
        ElMessage.error('请求超时，请检查网络后重试')
      } else {
        ElMessage.error('网络连接失败，请检查网络设置')
      }
    } else {
      const { status, data } = error.response
      switch (status) {
        case 401:
          ElMessage.error('登录已过期，请重新登录')
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          router.push('/login')
          break
        case 403:
          ElMessage.error('没有权限执行此操作')
          break
        case 404:
          ElMessage.error(data?.error || '请求的资源不存在')
          break
        case 422:
          ElMessage.error(data?.error || '提交数据验证失败')
          break
        case 500:
          ElMessage.error('服务器内部错误，请稍后重试')
          break
        default:
          ElMessage.error(data?.error || '请求失败')
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
