/**
 * Format a date/time value to 'YYYY-MM-DD HH:mm'
 * @param {string|Date} time - Date string or Date object
 * @returns {string} Formatted date string or '-' if falsy
 */
export function formatTime(time) {
  if (!time) return '-'
  const d = new Date(time)
  if (isNaN(d.getTime())) return '-'
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * Format a date value to 'YYYY-MM-DD'
 * @param {string|Date} time - Date string or Date object
 * @returns {string} Formatted date string or '-' if falsy
 */
export function formatDate(time) {
  if (!time) return '-'
  const d = new Date(time)
  if (isNaN(d.getTime())) return '-'
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Format a number as currency with comma separators
 * @param {number} amount - The number to format
 * @returns {string} Formatted number string
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '0'
  return Number(amount).toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })
}

/**
 * Format a large number with comma separators
 * @param {number} num - The number to format
 * @returns {string} Formatted number string
 */
export function formatNumber(num) {
  if (num === null || num === undefined) return '0'
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return Number(num).toLocaleString('zh-CN')
}
