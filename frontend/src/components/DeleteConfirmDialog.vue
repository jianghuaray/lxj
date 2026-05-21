<template>
  <div class="dialog-overlay" :class="{ active: visible }" @click.self="handleCancel">
    <div class="dialog-wrapper">
      <div class="dialog">
        <button class="dialog-close" @click="handleCancel">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <div class="dialog-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </div>
        <div class="dialog-title">{{ title }}</div>
        <div class="dialog-message" v-html="message"></div>
        <div class="dialog-warning" v-if="warning">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p v-html="warning"></p>
        </div>
        <div class="dialog-actions">
          <button class="btn-cancel" @click="handleCancel">取消</button>
          <button class="btn-delete" @click="handleConfirm">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
            </svg>
            确认删除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  title: { type: String, default: '确认删除' },
  message: { type: String, default: '' },
  warning: { type: String, default: '' }
})

const emit = defineEmits(['confirm', 'cancel'])

const visible = ref(false)

onMounted(() => {
  // 触发入场动画
  requestAnimationFrame(() => {
    visible.value = true
  })
  document.addEventListener('keydown', handleKeydown)
  document.body.style.overflow = 'hidden'
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})

function handleKeydown(e) {
  if (e.key === 'Escape') handleCancel()
}

function handleConfirm() {
  visible.value = false
  setTimeout(() => emit('confirm'), 300)
}

function handleCancel() {
  visible.value = false
  setTimeout(() => emit('cancel'), 300)
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(44, 44, 36, 0.3);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
}
.dialog-overlay.active {
  opacity: 1;
  visibility: visible;
}

.dialog-wrapper {
  position: relative;
}

.dialog {
  background: var(--card-bg, #FEFEFA);
  border: 1px solid rgba(222, 216, 207, 0.5);
  border-radius: 24px 16px 24px 16px;
  box-shadow: 0 20px 60px -15px rgba(44, 44, 36, 0.2);
  padding: 32px;
  width: 420px;
  max-width: 90vw;
  transform: scale(0.9) translateY(10px);
  transition: all 0.3s ease;
}
.dialog-overlay.active .dialog {
  transform: scale(1) translateY(0);
}

.dialog-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--muted-fg, #78786C);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  z-index: 1;
}
.dialog-close:hover {
  background: rgba(222, 216, 207, 0.4);
  color: var(--fg, #3D3D35);
}
.dialog-close svg {
  width: 18px;
  height: 18px;
  stroke-width: 2;
}

.dialog-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(212, 114, 106, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}
.dialog-icon svg {
  width: 28px;
  height: 28px;
  color: var(--destructive, #D4726A);
  stroke-width: 1.5;
}

.dialog-title {
  font-family: var(--font-display, 'PingFang SC', 'Microsoft YaHei', serif);
  font-weight: 700;
  font-size: 20px;
  color: var(--fg, #3D3D35);
  margin-bottom: 10px;
  line-height: 1.3;
}

.dialog-message {
  font-size: 14px;
  font-weight: 400;
  color: var(--muted-fg, #78786C);
  line-height: 1.6;
  margin-bottom: 28px;
}
.dialog-message :deep(strong) {
  color: var(--fg, #3D3D35);
  font-weight: 600;
}

.dialog-warning {
  background: rgba(232, 184, 75, 0.08);
  border: 1px solid rgba(232, 184, 75, 0.2);
  border-radius: 12px;
  padding: 12px 14px;
  margin-bottom: 24px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.dialog-warning svg {
  width: 18px;
  height: 18px;
  color: #B8922E;
  flex-shrink: 0;
  margin-top: 1px;
}
.dialog-warning p {
  font-size: 13px;
  color: #9A7A1F;
  line-height: 1.5;
}
.dialog-warning :deep(strong) {
  color: #7A6118;
  font-weight: 600;
}

.dialog-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.btn-cancel {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  padding: 0 24px;
  border-radius: 999px;
  border: 2px solid var(--border, #DED8CF);
  background: transparent;
  color: var(--muted-fg, #78786C);
  font-family: var(--font-body, 'PingFang SC', 'Microsoft YaHei', sans-serif);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 88px;
}
.btn-cancel:hover {
  border-color: var(--fg, #3D3D35);
  color: var(--fg, #3D3D35);
  background: rgba(61, 61, 53, 0.04);
}
.btn-cancel:active {
  transform: scale(0.95);
}

.btn-delete {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 40px;
  padding: 0 24px;
  border-radius: 999px;
  border: none;
  background: var(--destructive, #D4726A);
  color: white;
  font-family: var(--font-body, 'PingFang SC', 'Microsoft YaHei', sans-serif);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 16px -2px rgba(212, 114, 106, 0.3);
  transition: all 0.3s ease;
  min-width: 88px;
}
.btn-delete:hover {
  background: var(--destructive-hover, #C4635B);
  box-shadow: 0 6px 20px -2px rgba(212, 114, 106, 0.35);
  transform: translateY(-1px);
}
.btn-delete:active {
  transform: scale(0.95);
}
.btn-delete svg {
  width: 16px;
  height: 16px;
  stroke-width: 2;
}
</style>
