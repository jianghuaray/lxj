<template>
  <div class="map-card">
    <div class="chart-header">
      <div class="chart-title">西安市区县工单分布</div>
      <div class="chart-subtitle">各区县工单数量热力图</div>
    </div>
    <div ref="mapChartRef" class="map-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts/core'
import { MapChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  VisualMapComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import api from '@/utils/api'

echarts.use([
  MapChart,
  TitleComponent,
  TooltipComponent,
  VisualMapComponent,
  CanvasRenderer
])

const props = defineProps({
  data: {
    type: Array,
    default: () => []
  }
})

const mapChartRef = ref(null)
let mapChart = null

async function initChart() {
  if (!mapChartRef.value) return

  mapChart = echarts.init(mapChartRef.value)

  try {
    const response = await fetch('/xian.geojson')
    const geoJson = await response.json()

    echarts.registerMap('xian', geoJson)

    renderMap()
  } catch (error) {
    console.error('加载地图数据失败:', error)
  }
}

function renderMap() {
  if (!mapChart) return

  const maxCount = Math.max(...props.data.map(d => d.count || 0), 1)

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: params => {
        const data = props.data.find(d => d.area === params.name)
        const count = data?.count || 0
        return `<strong>${params.name}</strong><br/>工单数量: ${count} 单`
      },
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e0e0e0',
      borderWidth: 1,
      textStyle: {
        color: '#333'
      }
    },
    visualMap: {
      min: 0,
      max: maxCount,
      text: ['高', '低'],
      realtime: false,
      calculable: true,
      inRange: {
        color: ['#e0f3f8', '#abd9e9', '#74add1', '#4575b4', '#313695']
      },
      textStyle: {
        color: '#666'
      },
      left: 'left',
      bottom: '20'
    },
    series: [{
      name: '工单数量',
      type: 'map',
      map: 'xian',
      roam: true,
      zoom: 1.2,
      scaleLimit: {
        min: 0.8,
        max: 3
      },
      label: {
        show: true,
        formatter: '{b}',
        fontSize: 12,
        color: '#333'
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 14,
          fontWeight: 'bold',
          color: '#fff'
        },
        itemStyle: {
          areaColor: '#4575b4'
        }
      },
      itemStyle: {
        areaColor: '#e0f3f8',
        borderColor: '#fff',
        borderWidth: 2
      },
      data: props.data.map(d => ({
        name: d.area,
        value: d.count || 0
      }))
    }]
  }

  mapChart.setOption(option)
}

function handleResize() {
  mapChart?.resize()
}

watch(() => props.data, () => {
  renderMap()
}, { deep: true })

onMounted(() => {
  initChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  mapChart?.dispose()
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped lang="scss">
.map-card {
  background: var(--card-bg);
  border: 1px solid rgba(222, 216, 207, 0.5);
  border-radius: 24px 20px 24px 24px;
  padding: 24px;
  box-shadow: var(--shadow-soft);
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 8px 30px -4px rgba(74, 127, 181, 0.25);
  }
}

.chart-header {
  margin-bottom: 20px;
}

.chart-title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 16px;
  color: var(--fg);
  margin: 0 0 2px 0;
}

.chart-subtitle {
  font-family: var(--font-body);
  font-weight: 400;
  font-size: 12px;
  color: var(--muted-fg);
  margin: 0;
}

.map-container {
  width: 100%;
  height: 400px;
}
</style>
