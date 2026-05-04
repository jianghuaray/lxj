<template>
  <div class="login-container">
    <!-- Left brand panel -->
    <div class="brand-panel">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
      <div class="blob blob-3"></div>

      <div class="brand-content">
        <img src="/logo.png" alt="乐修匠Logo" class="logo-img">
        <h1 class="brand-name">乐修匠</h1>
        <p class="brand-subtitle">专业社区维修服务平台</p>

        <div class="features">
          <div class="feature-item">
            <div class="feature-icon">
              <svg viewBox="0 0 24 24">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
            </div>
            <span class="feature-title">专业维修</span>
            <span class="feature-desc">持证上岗</span>
          </div>

          <div class="feature-item">
            <div class="feature-icon">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <span class="feature-title">快速响应</span>
            <span class="feature-desc">30分钟上门</span>
          </div>

          <div class="feature-item">
            <div class="feature-icon">
              <svg viewBox="0 0 24 24">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <polyline points="9 12 11 14 15 10"/>
              </svg>
            </div>
            <span class="feature-title">品质保障</span>
            <span class="feature-desc">售后无忧</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Right login panel -->
    <div class="login-panel">
      <div class="login-card">
        <h2 class="login-title">欢迎回来</h2>
        <p class="login-subtitle">请输入您的账号信息</p>

        <form @submit.prevent="handleSubmit" autocomplete="off">
          <!-- Username -->
        <div class="input-group">
          <div class="input-wrapper">
            <span class="input-icon">
              <svg viewBox="0 0 24 24">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </span>
            <input
              type="text"
              v-model="form.username"
              class="login-input"
              placeholder="请输入用户名"
              id="username"
            >
          </div>
        </div>

        <!-- Password -->
        <div class="input-group">
          <div class="input-wrapper">
            <span class="input-icon">
              <svg viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
            <input
              :type="showPassword ? 'text' : 'password'"
              v-model="form.password"
              class="login-input login-password"
              placeholder="请输入密码"
              id="password"
            >
            <button
              type="button"
              class="toggle-password"
              @click="showPassword = !showPassword"
            >
              <svg v-if="!showPassword" viewBox="0 0 24 24">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <svg v-else viewBox="0 0 24 24">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
          </div>
        </div>

          <!-- Remember me & Forgot password -->
          <div class="form-options">
            <label class="remember-me">
              <input type="checkbox" v-model="form.remember" class="custom-checkbox" id="rememberMe">
              <span class="checkbox-visual">
                <svg viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </span>
              <span class="remember-text">记住我</span>
            </label>
            <a href="#" class="forgot-link">忘记密码?</a>
          </div>

          <!-- Login button -->
          <button type="submit" class="login-btn" :disabled="loading">
            {{ loading ? '登录中...' : '登 录' }}
          </button>
        </form>
      </div>

      <div class="copyright">&copy; 2026 乐修匠社区维修管理系统 版权所有</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'

const router = useRouter()
const authStore = useAuthStore()

const form = ref({
  username: '',
  password: '',
  remember: false
})
const showPassword = ref(false)
const loading = ref(false)

async function handleSubmit() {
  if (!form.value.username || !form.value.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }

  loading.value = true

  try {
    await authStore.login({
      username: form.value.username,
      password: form.value.password
    })
    ElMessage.success('登录成功')
    // Use replace to avoid back-button returning to login
    await router.replace('/')
  } catch (error) {
    console.error('Login failed:', error)
    if (error.response?.status === 401) {
      ElMessage.error('用户名或密码错误')
    } else if (error.response?.data?.error) {
      ElMessage.error(error.response.data.error)
    } else {
      ElMessage.error('登录失败，请检查网络连接')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.login-container {
  display: flex;
  width: 100%;
  height: 100vh;
}

/* Left brand panel */
.brand-panel {
  flex: 0 0 60%;
  background: var(--bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

/* Organic blob decorations */
.blob {
  position: absolute;
  border-radius: inherit;
  pointer-events: none;
}

.blob-1 {
  width: 300px;
  height: 300px;
  background: var(--primary);
  filter: blur(100px);
  opacity: 0.08;
  border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
  top: -40px;
  right: -60px;
}

.blob-2 {
  width: 250px;
  height: 250px;
  background: var(--secondary);
  filter: blur(80px);
  opacity: 0.06;
  border-radius: 40% 60% 70% 30% / 40% 70% 30% 60%;
  bottom: -30px;
  left: -50px;
}

.blob-3 {
  width: 200px;
  height: 200px;
  background: var(--accent);
  filter: blur(60px);
  opacity: 0.05;
  border-radius: 50% 50% 40% 60% / 50% 40% 60% 50%;
  top: 50%;
  right: 15%;
  transform: translateY(-50%);
}

.brand-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
}

.logo-img {
  height: 100px;
  width: auto;
  display: block;
}

.brand-name {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 42px;
  color: var(--fg);
  margin-top: var(--spacing-sm);
  letter-spacing: 2px;
}

.brand-subtitle {
  font-family: var(--font-body);
  font-weight: 400;
  font-size: 16px;
  color: var(--muted-fg);
  margin-top: -4px;
}

/* Feature items */
.features {
  display: flex;
  gap: 40px;
  margin-top: 48px;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.feature-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(74, 127, 181, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-base);

  &:hover {
    background: rgba(74, 127, 181, 0.18);
    transform: translateY(-2px);
  }

  svg {
    width: 24px;
    height: 24px;
    stroke: var(--primary);
    stroke-width: 2;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
}

.feature-title {
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 13px;
  color: var(--fg);
}

.feature-desc {
  font-family: var(--font-body);
  font-weight: 400;
  font-size: 11px;
  color: var(--muted-fg);
}

/* Right login panel */
.login-panel {
  flex: 0 0 40%;
  background: var(--card-bg);
  border-left: 1px solid rgba(222, 216, 207, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
}

.login-card {
  max-width: 400px;
  width: 90%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.login-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 28px;
  color: var(--fg);
  margin-bottom: 6px;
}

.login-subtitle {
  font-family: var(--font-body);
  font-weight: 400;
  font-size: 14px;
  color: var(--muted-fg);
  margin-bottom: 36px;
}

/* Input fields */
.input-group {
  width: 100%;
  position: relative;
  margin-bottom: 16px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  z-index: 1;

  svg {
    width: 18px;
    height: 18px;
    stroke: var(--primary);
    stroke-width: 2;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
}

.login-input {
  width: 100%;
  height: 52px;
  border-radius: 999px;
  border: 1px solid rgba(222, 216, 207, 0.8);
  background: rgba(255, 255, 255, 0.5);
  padding: 0 20px 0 64px;
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--fg);
  outline: none;
  transition: all var(--transition-base);

  &::placeholder {
    color: var(--muted-fg);
    opacity: 0.7;
  }

  &:focus {
    box-shadow: 0 0 0 2px rgba(74, 127, 181, 0.3);
    border-color: rgba(74, 127, 181, 0.4);
    background: rgba(255, 255, 255, 0.7);
  }
}

.login-password {
  padding-right: 50px;
}

.toggle-password {
  position: absolute;
  right: 18px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;

  svg {
    width: 18px;
    height: 18px;
    stroke: var(--muted-fg);
    stroke-width: 2;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: stroke 0.3s ease;
  }

  &:hover svg {
    stroke: var(--primary);
  }
}

/* Remember me & Forgot password */
.form-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 28px;
  margin-top: 4px;
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.custom-checkbox {
  display: none;

  &:checked + .checkbox-visual {
    background: var(--primary);
    border-color: var(--primary);

    svg {
      opacity: 1;
      transform: scale(1);
    }
  }
}

.checkbox-visual {
  width: 18px;
  height: 18px;
  border-radius: 5px;
  border: 1.5px solid var(--border);
  background: rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  flex-shrink: 0;

  svg {
    width: 12px;
    height: 12px;
    stroke: var(--primary-fg);
    stroke-width: 2.5;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
    opacity: 0;
    transform: scale(0.5);
    transition: all 0.2s ease;
  }
}

.remember-text {
  font-family: var(--font-body);
  font-weight: 500;
  font-size: 13px;
  color: var(--muted-fg);
}

.forgot-link {
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 13px;
  color: var(--secondary);
  text-decoration: none;
  transition: color 0.3s ease;

  &:hover {
    color: #c9a030;
  }
}

/* Login button */
.login-btn {
  width: 100%;
  height: 52px;
  border-radius: 999px;
  border: none;
  background: var(--primary);
  color: var(--primary-fg);
  font-family: var(--font-body);
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: var(--shadow-soft);
  letter-spacing: 0.5px;

  &:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 6px 28px -2px rgba(74, 127, 181, 0.25);
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
    box-shadow: 0 2px 12px -2px rgba(74, 127, 181, 0.2);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
}

/* Copyright */
.copyright {
  position: absolute;
  bottom: 24px;
  font-family: var(--font-body);
  font-weight: 400;
  font-size: 11px;
  color: var(--muted-fg);
  text-align: center;
}

/* Responsive */
@media (max-width: 900px) {
  .login-container {
    flex-direction: column;
  }

  .brand-panel {
    flex: 0 0 auto;
    padding: 40px 20px 32px;
  }

  .brand-name {
    font-size: 32px;
  }

  .features {
    gap: 24px;
    margin-top: 32px;
  }

  .feature-icon {
    width: 48px;
    height: 48px;

    svg {
      width: 20px;
      height: 20px;
    }
  }

  .login-panel {
    flex: 1;
    border-left: none;
    border-top: 1px solid rgba(222, 216, 207, 0.5);
  }

  .login-card {
    max-width: 360px;
  }
}

@media (max-width: 480px) {
  .features {
    gap: 16px;
  }

  .feature-desc {
    display: none;
  }

  .brand-name {
    font-size: 28px;
  }

  .brand-subtitle {
    font-size: 14px;
  }
}
</style>
