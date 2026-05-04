# MEMORY.md - 长期记忆

## 师傅管理页面 (TechnicianList.vue) 修改记录

### 2026-05-03 修改内容
1. **删除查看详情按钮** - 从师傅卡片操作栏移除
2. **编辑功能优化** - 跳转到 `/technicians/edit/${tech.id}` 路由
3. **添加抽成比例显示** - 在联系方式行右侧显示抽成比例
   - 样式：黄色背景标签，圆角胶囊形状
   - CSS 类：`.commission-badge`

### 路由配置
- 添加编辑师傅路由：`/technicians/edit/:id`
- 编辑页面复用 `TechnicianAdd.vue`，通过 `route.params.id` 判断编辑模式

### 编辑师傅页面 (TechnicianAdd.vue) 修改
- `fetchTechnician()` 支持从 `route.params.id` 或 `route.query.id` 获取师傅ID
- `submitForm()` 根据是否有 ID 判断是添加还是更新
- 支持 commissionRate 或 commission 字段

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
