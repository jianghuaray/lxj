/**
 * xlsx 导出工具函数
 * 生成真正的 .xlsx 文件，支持中文，列宽自适应
 */

import * as XLSX from 'xlsx'

/**
 * 导出数据为 .xlsx 文件
 * @param {string} filename - 文件名（不含扩展名）
 * @param {string[]} headers - 表头数组
 * @param {any[][]} data - 二维数据数组
 * @param {object} [options]
 * @param {string} [options.sheetName='Sheet1']
 */
export function exportToExcel(filename, headers, data, options = {}) {
  const sheetName = options.sheetName || 'Sheet1'

  const wsData = [
    headers,
    ...data.map(row =>
      row.map(cell => formatCell(cell))
    )
  ]

  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // 列宽自适应（取表头和数据样本的最大值）
  ws['!cols'] = headers.map((h, i) => ({
    wch: Math.min(
      Math.max(
        h.length * 2 + 4,
        ...data.slice(0, 50).map(row => {
          const val = String(row[i] ?? '')
          return Math.min(val.length * 2 + 2, 40)
        })
      ),
      40
    )
  }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

function formatCell(cell) {
  if (cell === null || cell === undefined) return ''
  if (typeof cell === 'boolean') return cell
  if (typeof cell === 'number') return cell
  return String(cell)
}

/**
 * 格式化日期用于导出
 * @param {string|Date} dateStr
 * @returns {string}
 */
export function formatDateForExport(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return String(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
