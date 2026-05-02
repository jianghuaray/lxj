<template>
  <div class="not-found-page">
    <div class="blob blob-1" style="top:-100px;right:-50px;"></div>
    <div class="blob blob-2" style="bottom:-80px;left:-60px;"></div>
    <div class="error-content">
      <h1 class="error-code">404</h1>
      <p class="error-text">抱歉，您访问的页面不存在</p>
      <button class="btn-back" @click="$router.push('/')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        返回首页
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.not-found-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  position: relative;
  z-index: 1;
}
.error-content {
  text-align: center;
}
.error-code {
  font-family: var(--font-display);
  font-size: 120px;
  font-weight: 800;
  color: var(--primary);
  opacity: 0.15;
  line-height: 1;
  margin-bottom: 8px;
}
.error-text {
  font-family: var(--font-body);
  font-size: 18px;
  color: var(--muted-fg);
  margin-bottom: 32px;
}
.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 28px;
  border-radius: 999px;
  border: none;
  background: var(--primary);
  color: white;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--shadow-soft);
  transition: all 0.3s ease;
}
.btn-back:hover {
  transform: scale(1.05);
  box-shadow: var(--shadow-hover);
}
</style>
