/**
 * ECharts 通用配置 — 提取 Dashboard 图表共享的样式常量
 */
import * as echarts from 'echarts/core'

// 字体
const FONT_BODY = 'Nunito, sans-serif'
const FONT_DISPLAY = 'Fraunces, serif'

// 色板
const COLORS = {
  primary: '#4A7FB5',
  secondary: '#E8B84B',
  destructive: '#D4726A',
  muted: '#78786C',
  fg: '#2C2C24',
  bg: '#FEFEFA',
  border: '#ded8cf',
  pie: ['#4A7FB5', '#E8B84B', '#D4726A', '#8B9E7E', '#C4A882', '#A67C52', '#9CA38C', '#B8A9C8']
}

/**
 * 通用 tooltip 配置
 */
export function baseTooltip(overrides = {}) {
  return {
    backgroundColor: '#2c2c24',
    borderColor: '#2c2c24',
    textStyle: { color: '#fff', fontFamily: FONT_BODY, fontWeight: 600 },
    ...overrides
  }
}

/**
 * 通用 category X 轴
 */
export function baseCategoryX(data, overrides = {}) {
  return {
    type: 'category',
    boundaryGap: false,
    data,
    axisLine: { lineStyle: { color: COLORS.border } },
    axisLabel: { color: COLORS.muted, fontFamily: FONT_BODY, fontSize: 11 },
    axisTick: { show: false },
    ...overrides
  }
}

/**
 * 通用 value Y 轴
 */
export function baseValueY(overrides = {}) {
  return {
    type: 'value',
    axisLine: { show: false },
    splitLine: { lineStyle: { color: 'rgba(222,216,207,0.4)' } },
    axisLabel: { color: COLORS.muted, fontFamily: FONT_BODY, fontSize: 11 },
    ...overrides
  }
}

/**
 * 通用 grid（折线/柱状图）
 */
export function baseGrid(overrides = {}) {
  return { left: 50, right: 20, top: 20, bottom: 40, ...overrides }
}

/**
 * 通用折线 series（area 渐变）
 * @param {Array} data - 数据数组
 * @param {string} hexColor - 主色 hex 如 '#4A7FB5'
 * @param {object} overrides - 覆盖字段
 */
export function areaLineSeries(data, hexColor, overrides = {}) {
  // 将 hex 转换为 rgba 渐变
  const r = parseInt(hexColor.slice(1, 3), 16)
  const g = parseInt(hexColor.slice(3, 5), 16)
  const b = parseInt(hexColor.slice(5, 7), 16)
  return {
    type: 'line',
    smooth: true,
    data,
    areaStyle: {
      color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: `rgba(${r},${g},${b},0.15)` },
        { offset: 1, color: `rgba(${r},${g},${b},0)` }
      ])
    },
    lineStyle: { color: hexColor, width: 2.5, lineCap: 'round', lineJoin: 'round' },
    itemStyle: { color: hexColor, borderColor: COLORS.bg, borderWidth: 2.5 },
    symbolSize: 7,
    showSymbol: true,
    ...overrides
  }
}

/**
 * 通用柱状 series（渐变 + 圆角）
 */
export function gradientBarSeries(data, colorStart, colorEnd, overrides = {}) {
  return {
    type: 'bar',
    data,
    itemStyle: {
      color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: colorStart },
        { offset: 1, color: colorEnd }
      ]),
      borderRadius: [6, 6, 0, 0]
    },
    barWidth: '40%',
    ...overrides
  }
}

export { COLORS, FONT_BODY, FONT_DISPLAY }
