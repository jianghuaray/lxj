# MEMORY.md - 长期记忆

## Element Plus el-select CSS 选择器（关键！）

**项目使用的 Element Plus 版本：2.x**

### 错误的旧选择器（Element Plus 1.x）
```scss
.el-input__wrapper  // ❌ 不适用于 el-select
```

### 正确的选择器（Element Plus 2.x）
```scss
.el-select__wrapper    // ✅ 触发器容器
.el-select__placeholder // ✅ 占位文本
.el-select__selected-item  // ✅ 已选中文本
.el-select__suffix     // ✅ 右侧图标区域
.el-select__caret      // ✅ 下拉箭头图标
```

### 筛选栏统一样式（40px高度，14px字体）
所有使用 `filter-select-el` 类的 el-select 需要：
```scss
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
  :deep(.el-select__placeholder),
  :deep(.el-select__selected-item) {
    font-size: 14px !important;
    color: var(--fg) !important;
    line-height: 40px !important;
  }
}
```

## 已修改的文件
- `/frontend/src/views/CustomerList.vue` ✅
- `/frontend/src/views/CallbackList.vue` ✅
- `/frontend/src/views/TechnicianList.vue` ✅
- `/frontend/src/views/SystemSettings.vue` ✅
- `/frontend/src/views/orders/OrderList.vue` ✅ (工单管理页面)
