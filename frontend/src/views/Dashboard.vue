<template>
  <div class="dashboard-page">
    <div class="page-header">
      <h1 class="page-title">数据看板</h1>
      <div class="time-switcher">
        <button
          v-for="t in timeOptions"
          :key="t.value"
          class="time-btn"
          :class="{ active: timeRange === t.value }"
          @click="timeRange = t.value; fetchAll()"
        >{{ t.label }}</button>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="kpi-grid">
      <div class="kpi-card" :style="{ borderRadius: kpiRadius[0] }">
        <div class="kpi-top">
          <div class="kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </div>
          <div class="kpi-trend up" v-if="stats.orderTrend !== undefined">
            <svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            +{{ stats.orderTrend }}%
          </div>
        </div>
        <div class="kpi-value">{{ stats.totalOrders || 0 }}</div>
        <div class="kpi-label">工单总数</div>
      </div>

      <div class="kpi-card" :style="{ borderRadius: kpiRadius[1] }">
        <div class="kpi-top">
          <div class="kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div class="kpi-trend up" v-if="stats.completionRate !== undefined">
            <svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            +{{ stats.completionRate }}%
          </div>
        </div>
        <div class="kpi-value">{{ stats.completionRate || 0 }}%</div>
        <div class="kpi-label">完成率</div>
      </div>

      <div class="kpi-card" :style="{ borderRadius: kpiRadius[2] }">
        <div class="kpi-top">
          <div class="kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <div class="kpi-trend down" v-if="stats.cancelRate !== undefined">
            <svg viewBox="0 0 24 24"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
            -{{ stats.cancelRate }}%
          </div>
        </div>
        <div class="kpi-value">{{ stats.cancelRate || 0 }}%</div>
        <div class="kpi-label">取消率</div>
      </div>

      <div class="kpi-card" :style="{ borderRadius: kpiRadius[3] }">
        <div class="kpi-top">
          <div class="kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
          <div class="kpi-trend up" v-if="stats.avgSatisfaction && stats.avgSatisfaction !== '-'">
            <svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            +0.2
          </div>
        </div>
        <div class="kpi-value">{{ stats.avgSatisfaction || '-' }}<span class="kpi-unit" v-if="stats.avgSatisfaction && stats.avgSatisfaction !== '-'">分</span></div>
        <div class="kpi-label">平均满意度</div>
      </div>

      <div class="kpi-card" :style="{ borderRadius: kpiRadius[4] }">
        <div class="kpi-top">
          <div class="kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div class="kpi-trend up" v-if="stats.revenueTrend !== undefined">
            <svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            +{{ stats.revenueTrend }}%
          </div>
        </div>
        <div class="kpi-value">&yen;{{ formatNumber(stats.totalRevenue || 0) }}</div>
        <div class="kpi-label">总营收</div>
      </div>

      <div class="kpi-card" :style="{ borderRadius: kpiRadius[5] }">
        <div class="kpi-top">
          <div class="kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          </div>
          <div class="kpi-trend warn">需关注</div>
        </div>
        <div class="kpi-value">{{ stats.pendingCallbackCount || 0 }}</div>
        <div class="kpi-label">待回访</div>
      </div>

      <div class="kpi-card" :style="{ borderRadius: kpiRadius[6] }">
        <div class="kpi-top">
          <div class="kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </div>
        </div>
        <div class="kpi-value">{{ stats.volunteerCount || 0 }}</div>
        <div class="kpi-label">志愿者总数</div>
      </div>

      <div class="kpi-card" :style="{ borderRadius: kpiRadius[7] }">
        <div class="kpi-top">
          <div class="kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
        </div>
        <div class="kpi-value">{{ stats.serviceHours || 0 }}<span class="kpi-unit">小时</span></div>
        <div class="kpi-label">志愿服务时长</div>
      </div>
    </div>

    <!-- Charts: only 2 in a row, matching design -->
    <div class="charts-grid">
      <!-- Line Chart -->
      <div class="chart-card" style="border-radius: 24px 24px 20px 24px;">
        <div class="chart-header">
          <div class="chart-title">工单量趋势</div>
          <div class="chart-subtitle">近7天工单数量变化</div>
        </div>
        <div ref="lineChartRef" class="chart-container"></div>
      </div>

      <!-- Donut Chart -->
      <div class="chart-card" style="border-radius: 20px 24px 24px 24px;">
        <div class="chart-header">
          <div class="chart-title">维修类型分布</div>
          <div class="chart-subtitle">各类维修工单占比</div>
        </div>
        <div ref="pieChartRef" class="chart-container"></div>
      </div>

      <!-- Bar Chart: area distribution -->
      <div class="chart-card" style="border-radius: 24px 20px 24px 24px;">
        <div class="chart-header">
          <div class="chart-title">区域分布</div>
          <div class="chart-subtitle">各区域工单数量对比</div>
        </div>
        <div ref="barChartRef" class="chart-container"></div>
      </div>

      <!-- Revenue Chart -->
      <div class="chart-card" style="border-radius: 24px 24px 24px 20px;">
        <div class="chart-header">
          <div class="chart-title">营收趋势</div>
          <div class="chart-subtitle">服务费收入变化</div>
        </div>
        <div ref="revenueChartRef" class="chart-container"></div>
      </div>
    </div>

    <!-- Ranking -->
    <h3 class="section-title">师傅满意度排行</h3>
    <div class="ranking-grid">
      <div
        v-for="(tech, index) in techRanking.slice(0, 5)"
        :key="tech.id"
        class="rank-card"
        :style="{ borderRadius: rankRadius[index] }"
      >
        <div class="rank-badge" :class="`r${index + 1}`">{{ index + 1 }}</div>
        <div class="rank-avatar">{{ tech.name?.charAt(0) || '师' }}</div>
        <div class="rank-name">{{ tech.name }}</div>
        <div class="rank-score">{{ tech.avgSatisfaction || '-' }}</div>
        <div class="rank-orders">{{ tech.orderCount || 0 }}单</div>
        <div class="rank-bar-wrap">
          <div class="rank-bar" :style="{ width: `${((parseFloat(tech.avgSatisfaction) || 0) / 5) * 100}%` }"></div>
        </div>
      </div>
    </div>

    <!-- Area Table -->
    <div class="table-card">
      <div class="chart-header">
        <div class="chart-title">社区维度分析</div>
        <div class="chart-subtitle">各社区工单完成情况与满意度</div>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>社区</th>
            <th>工单数</th>
            <th>完成数</th>
            <th>完成率</th>
            <th>满意度</th>
            <th>营收</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="area in areaStats" :key="area.area">
            <td style="font-weight:600">{{ area.area }}</td>
            <td>{{ area.total }}</td>
            <td>{{ area.completed }}</td>
            <td>
              <span class="table-bar-wrap"><span class="table-bar" :style="{ width: area.completionRate + '%' }"></span></span>
              <span style="font-weight:600">{{ area.completionRate?.toFixed(1) }}%</span>
            </td>
            <td>
              <span class="stars">
                <svg v-for="s in 5" :key="s" viewBox="0 0 24 24" :class="{ empty: s > Math.round(area.avgSatisfaction || 0) }"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </span>
              <span style="margin-left:6px;font-weight:600">{{ area.avgSatisfaction || '-' }}</span>
            </td>
            <td style="font-weight:600">&yen;{{ formatNumber(area.revenue || 0) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import api from '@/utils/api'
import { formatNumber } from '@/utils/format'
import { debounce } from '@/utils/debounce'
import { baseTooltip, baseCategoryX, baseValueY, baseGrid, areaLineSeries, gradientBarSeries, COLORS, FONT_BODY, FONT_DISPLAY } from '@/utils/chartConfig'
// ECharts on-demand import to reduce bundle size
import * as echarts from 'echarts/core'
import { LineChart, BarChart, PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  LineChart,
  BarChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  CanvasRenderer
])

const timeRange = ref('month')
const stats = ref({})
const techRanking = ref([])
const areaStats = ref([])
const lineChartRef = ref(null)
const pieChartRef = ref(null)
const barChartRef = ref(null)
const revenueChartRef = ref(null)
let lineChart = null
let pieChart = null
let barChart = null
let revenueChart = null

const timeOptions = [
  { label: '今日', value: 'today' },
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '本季', value: 'quarter' }
]

const kpiRadius = [
  '24px 24px 24px 20px',
  '20px 24px 24px 24px',
  '24px 20px 24px 24px',
  '24px 24px 20px 24px',
  '20px 24px 24px 24px',
  '24px 20px 24px 24px',
  '24px 24px 20px 20px',
  '20px 24px 20px 24px'
]

const rankRadius = [
  '24px 24px 20px 24px',
  '20px 24px 24px 24px',
  '24px 20px 24px 24px',
  '24px 24px 24px 20px',
  '20px 24px 20px 24px'
]

async function fetchAll() {
  await Promise.all([
    fetchStats(),
    fetchOrderTrend(),
    fetchCategoryDist(),
    fetchAreaDist(),
    fetchAreaStats(),
    fetchRevenueTrend(),
    fetchTechRanking()
  ])
}

async function fetchStats() {
  try {
    const response = await api.get('/dashboard', { params: { timeRange: timeRange.value } })
    stats.value = response.data
  } catch (error) {
    console.error('获取统计数据失败', error)
  }
}

async function fetchOrderTrend() {
  try {
    const response = await api.get('/dashboard/order-trend', { params: { days: 7 } })
    renderLineChart(response.data)
  } catch (error) {
    console.error('获取工单趋势失败', error)
  }
}

async function fetchCategoryDist() {
  try {
    const response = await api.get('/dashboard/category-distribution')
    renderDonutChart(response.data)
  } catch (error) {
    console.error('获取类型分布失败', error)
  }
}

async function fetchAreaDist() {
  try {
    const response = await api.get('/dashboard/area-distribution')
    renderBarChart(response.data)
  } catch (error) {
    console.error('获取区域分布失败', error)
  }
}

async function fetchAreaStats() {
  try {
    const response = await api.get('/dashboard/area-stats')
    areaStats.value = response.data || []
  } catch (error) {
    console.error('获取区域统计失败', error)
  }
}

async function fetchRevenueTrend() {
  try {
    const response = await api.get('/dashboard/revenue-trend', { params: { days: 7 } })
    renderRevenueChart(response.data)
  } catch (error) {
    console.error('获取营收趋势失败', error)
  }
}

async function fetchTechRanking() {
  try {
    const response = await api.get('/dashboard/technician-ranking')
    techRanking.value = response.data
  } catch (error) {
    console.error('获取师傅排行失败', error)
  }
}

function renderLineChart(data) {
  if (!lineChartRef.value) return
  lineChart = echarts.init(lineChartRef.value)
  lineChart.setOption({
    tooltip: baseTooltip({
      trigger: 'axis',
      formatter: params => `${params[0].name}: ${params[0].value}单`
    }),
    grid: baseGrid(),
    xAxis: baseCategoryX(data?.map(d => d.date?.slice(5) || '') || []),
    yAxis: baseValueY(),
    series: [areaLineSeries(data?.map(d => d.count || 0) || [], COLORS.primary, { name: '工单量' })]
  })
}

function renderDonutChart(data) {
  if (!pieChartRef.value) return
  pieChart = echarts.init(pieChartRef.value)
  const total = data?.reduce((s, d) => s + (d.count || 0), 0) || 0
  pieChart.setOption({
    tooltip: baseTooltip({
      trigger: 'item',
      formatter: p => `${p.name}: ${p.value}单 (${p.percent}%)`
    }),
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: { color: COLORS.fg, fontFamily: FONT_BODY, fontSize: 13 },
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 10,
      icon: 'roundRect',
      formatter: name => {
        const item = data?.find(d => d.category === name)
        const pct = item ? ((item.count / total) * 100).toFixed(1) : 0
        return `${name}  ${item?.count || 0} (${pct}%)`
      }
    },
    graphic: [{
      type: 'text',
      left: '22%',
      top: '42%',
      style: {
        text: `${total}`,
        textAlign: 'center',
        fill: COLORS.fg,
        fontSize: 24,
        fontWeight: 700,
        fontFamily: FONT_DISPLAY
      }
    }, {
      type: 'text',
      left: '22%',
      top: '54%',
      style: {
        text: '工单总数',
        textAlign: 'center',
        fill: COLORS.muted,
        fontSize: 11,
        fontFamily: FONT_BODY
      }
    }],
    series: [{
      name: '维修类型', type: 'pie',
      radius: ['40%', '70%'],
      center: ['25%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 4, borderColor: COLORS.bg, borderWidth: 2 },
      label: { show: false },
      emphasis: {
        scaleSize: 6,
        itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.15)' }
      },
      data: data?.map((d, i) => ({
        value: d.count, name: d.category,
        itemStyle: { color: COLORS.pie[i % COLORS.pie.length] }
      })) || []
    }]
  })
}

function renderBarChart(data) {
  if (!barChartRef.value) return
  barChart = echarts.init(barChartRef.value)
  barChart.setOption({
    tooltip: baseTooltip({ trigger: 'axis' }),
    grid: baseGrid(),
    xAxis: baseCategoryX(data?.map(d => d.area || '') || [], { boundaryGap: true }),
    yAxis: baseValueY(),
    series: [gradientBarSeries(data?.map(d => d.count || 0) || [], COLORS.primary, '#8DB4D6')]
  })
}

function renderRevenueChart(data) {
  if (!revenueChartRef.value) return
  revenueChart = echarts.init(revenueChartRef.value)
  revenueChart.setOption({
    tooltip: baseTooltip({
      trigger: 'axis',
      formatter: params => `${params[0].name}: ¥${params[0].value}`
    }),
    grid: baseGrid({ left: 60 }),
    xAxis: baseCategoryX(data?.map(d => d.date?.slice(5) || '') || []),
    yAxis: baseValueY({
      axisLabel: { color: COLORS.muted, fontFamily: FONT_BODY, fontSize: 11, formatter: v => '¥' + v }
    }),
    series: [areaLineSeries(data?.map(d => d.revenue || 0) || [], COLORS.secondary, { name: '营收' })]
  })
}

// 防抖处理，防止窗口拖拽时高频触发多个 chart.resize()
const handleResize = debounce(() => {
  lineChart?.resize()
  pieChart?.resize()
  barChart?.resize()
  revenueChart?.resize()
}, 200)

onMounted(async () => {
  await fetchAll()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  lineChart?.dispose()
  pieChart?.dispose()
  barChart?.dispose()
  revenueChart?.dispose()
  handleResize.cancel()
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped lang="scss">
.dashboard-page {
  position: relative;
  z-index: 1;
}

/* Page Header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
  flex-wrap: wrap;
  gap: 16px;
}

.page-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 24px;
  color: var(--fg);
  margin: 0;
}

.time-switcher {
  display: flex;
  gap: 4px;
  background: var(--muted);
  border-radius: 999px;
  padding: 4px;
}

.time-btn {
  padding: 6px 16px;
  border-radius: 999px;
  border: none;
  background: transparent;
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
  color: var(--muted-fg);
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover { color: var(--fg); }
  &.active { background: var(--primary); color: #fff; box-shadow: var(--shadow-soft); }
}

/* KPI Grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 28px;
}

.kpi-card {
  background: var(--card-bg);
  border: 1px solid rgba(222, 216, 207, 0.5);
  padding: 24px;
  box-shadow: var(--shadow-soft);
  transition: all 0.3s ease;
  cursor: default;
  position: relative;
  overflow: hidden;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px -4px rgba(74, 127, 181, 0.25);
  }
}

.kpi-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.kpi-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(74, 127, 181, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;

  svg {
    width: 22px;
    height: 22px;
    stroke: var(--primary);
    stroke-width: 2;
    fill: none;
    transition: all 0.3s ease;
  }
}

.kpi-card:hover .kpi-icon {
  background: var(--primary);

  svg { stroke: #fff; }
}

.kpi-trend {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;

  svg {
    width: 14px;
    height: 14px;
    stroke: currentColor;
    stroke-width: 2.5;
    fill: none;
  }

  &.up { background: rgba(74, 127, 181, 0.1); color: var(--primary); }
  &.down { background: rgba(212, 114, 106, 0.1); color: var(--destructive); }
  &.warn { background: rgba(230, 220, 205, 0.6); color: var(--accent-fg); }
}

.kpi-value {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 26px;
  color: var(--fg);
  line-height: 1.2;
  margin-bottom: 4px;
}

.kpi-unit {
  font-size: 14px;
  font-weight: 500;
  color: var(--muted-fg);
  margin-left: 4px;
}

.kpi-label {
  font-family: var(--font-body);
  font-weight: 500;
  font-size: 12px;
  color: var(--muted-fg);
}

/* Charts Grid */
.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 28px;
}

.chart-card {
  background: var(--card-bg);
  border: 1px solid rgba(222, 216, 207, 0.5);
  padding: 24px;
  box-shadow: var(--shadow-soft);
  transition: all 0.3s ease;

  &:hover { box-shadow: 0 8px 30px -4px rgba(74, 127, 181, 0.25); }
}

.chart-header { margin-bottom: 20px; }

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

.chart-container {
  width: 100%;
  height: 260px;
}

/* Ranking */
.section-title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 16px;
  color: var(--fg);
  margin: 0 0 16px 0;
}

.ranking-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 28px;
}

.rank-card {
  background: var(--card-bg);
  border: 1px solid rgba(222, 216, 207, 0.5);
  padding: 20px;
  box-shadow: var(--shadow-soft);
  transition: all 0.3s ease;
  text-align: center;
  position: relative;
  overflow: hidden;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px -4px rgba(74, 127, 181, 0.25);
  }
}

.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 13px;
  margin-bottom: 12px;

  &.r1 { background: var(--secondary); color: #fff; }
  &.r2 { background: var(--border); color: var(--fg); }
  &.r3 { background: var(--accent); color: var(--accent-fg); }
  &.r4, &.r5 { background: var(--muted); color: var(--muted-fg); }
}

.rank-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  margin: 0 auto 10px;
  background: rgba(74, 127, 181, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 18px;
  color: var(--primary);
}

.rank-name { font-weight: 600; font-size: 14px; color: var(--fg); margin-bottom: 4px; }

.rank-score {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 26px;
  color: var(--primary);
  line-height: 1.2;
}

.rank-orders {
  font-size: 11px;
  color: var(--muted-fg);
  margin-top: 2px;
  margin-bottom: 12px;
}

.rank-bar-wrap {
  height: 6px;
  background: var(--muted);
  border-radius: 24px;
  overflow: hidden;
}

.rank-bar {
  height: 100%;
  border-radius: 24px;
  background: linear-gradient(90deg, var(--primary), #3D6A9A);
  transition: width 0.6s ease;
}

/* Table */
.table-card {
  background: var(--card-bg);
  border: 1px solid rgba(222, 216, 207, 0.5);
  border-radius: 24px 20px 24px 24px;
  padding: 24px;
  box-shadow: var(--shadow-soft);
  overflow: hidden;

  .chart-header { margin-bottom: 16px; }
}

.data-table {
  width: 100%;
  border-collapse: collapse;

  th {
    text-align: left;
    padding: 10px 16px;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 12px;
    color: var(--muted-fg);
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }

  td {
    padding: 14px 16px;
    font-size: 13px;
    color: var(--fg);
    border-bottom: 1px solid rgba(222, 216, 207, 0.3);
    vertical-align: middle;
  }

  tr:last-child td { border-bottom: none; }

  tbody tr {
    transition: background 0.3s;
    &:hover { background: var(--muted); }
  }
}

.table-bar-wrap {
  width: 100px;
  height: 6px;
  background: var(--muted);
  border-radius: 24px;
  overflow: hidden;
  display: inline-block;
  vertical-align: middle;
  margin-right: 8px;
}

.table-bar {
  height: 100%;
  border-radius: 24px;
  background: var(--primary);
  transition: width 0.6s ease;
}

.stars {
  display: inline-flex;
  gap: 2px;

  svg {
    width: 14px;
    height: 14px;
    fill: var(--secondary);
    stroke: none;

    &.empty { fill: var(--muted); }
  }
}

/* Responsive */
@media (max-width: 1200px) {
  .ranking-grid { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 900px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .charts-grid { grid-template-columns: 1fr; }
  .ranking-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 600px) {
  .kpi-grid { grid-template-columns: 1fr; }
  .ranking-grid { grid-template-columns: 1fr; }
}
</style>
