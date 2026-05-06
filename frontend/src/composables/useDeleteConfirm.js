import { createApp } from 'vue'
import DeleteConfirmDialog from '../components/DeleteConfirmDialog.vue'
import ElementPlus from 'element-plus'

/**
 * 命令式调用删除确认弹窗
 * @param {{ title?: string, message: string, warning?: string }} options
 * @returns {Promise<boolean>} true=确认, false/ rejected=取消
 */
export function useDeleteConfirm() {
  function confirmDelete({ title = '确认删除', message, warning = '' }) {
    return new Promise((resolve, reject) => {
      const container = document.createElement('div')
      document.body.appendChild(container)

      const app = createApp(DeleteConfirmDialog, {
        title,
        message,
        warning,
        onConfirm: () => {
          cleanup()
          resolve(true)
        },
        onCancel: () => {
          cleanup()
          reject('cancel')
        }
      })

      // 注册 ElementPlus 以确保组件能正常工作
      app.use(ElementPlus)
      app.mount(container)

      function cleanup() {
        app.unmount()
        container.remove()
      }
    })
  }

  return { confirmDelete }
}
