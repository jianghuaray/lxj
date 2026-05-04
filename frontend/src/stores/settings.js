import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/utils/api'

export const useSettingsStore = defineStore('settings', () => {
  const serviceTypes = ref([])
  const areas = ref([])
  const channels = ref([])
  const cancelReasons = ref([])
  const loaded = ref(false)
  const loading = ref(false)

  async function fetchAll() {
    if (loading.value) return
    loading.value = true
    try {
      const res = await api.get('/settings/all')
      serviceTypes.value = res.data.serviceTypes || []
      areas.value = res.data.areas || []
      channels.value = res.data.channels || []
      cancelReasons.value = res.data.cancelReasons || []
      loaded.value = true
    } catch (error) {
      console.error('获取基础数据失败:', error)
    } finally {
      loading.value = false
    }
  }

  /** Refresh a single category after add/edit/delete */
  async function refreshCategory(category) {
    try {
      const urlMap = {
        serviceTypes: '/settings/service-types',
        areas: '/settings/areas',
        channels: '/settings/channels',
        cancelReasons: '/settings/cancel-reasons',
      }
      const url = urlMap[category]
      if (!url) return
      const res = await api.get(url)
      const targetMap = {
        serviceTypes, areas, channels, cancelReasons,
      }
      if (targetMap[category]) {
        targetMap[category].value = res.data.items || []
      }
    } catch (error) {
      console.error(`刷新${category}失败:`, error)
    }
  }

  return {
    serviceTypes,
    areas,
    channels,
    cancelReasons,
    loaded,
    loading,
    fetchAll,
    refreshCategory,
  }
})
