/**
 * 格式化日期
 * @param {Date} date 日期对象
 * @param {String} format 格式化模板，默认 YYYY-MM-DD
 * @returns {String} 格式化后的日期字符串
 */
export function formatDate(date, format = 'YYYY-MM-DD') {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()
  
  const padStart = (num) => String(num).padStart(2, '0')
  
  return format
    .replace('YYYY', year)
    .replace('MM', padStart(month))
    .replace('DD', padStart(day))
    .replace('HH', padStart(hour))
    .replace('mm', padStart(minute))
    .replace('ss', padStart(second))
}

/**
 * 格式化时间
 * @param {Date} date 日期对象
 * @returns {String} 格式化后的时间字符串 HH:mm
 */
export function formatTime(date) {
  const hour = date.getHours()
  const minute = date.getMinutes()
  
  const padStart = (num) => String(num).padStart(2, '0')
  
  return `${padStart(hour)}:${padStart(minute)}`
} 