export type ColumnType = 'number' | 'date' | 'category' | 'text' | 'boolean' | 'url'

export interface ColumnInfo {
  name: string
  type: ColumnType
  uniqueValues?: string[]
  uniqueCount?: number
  min?: number
  max?: number
  mean?: number
  nullCount: number
  totalCount: number
  fillRate: number
}

export function detectColumnType(values: string[]): ColumnType {
  const nonEmpty = values.filter(v => v !== null && v !== undefined && String(v).trim() !== '')
  if (nonEmpty.length === 0) return 'text'

  // Check URL
  const urlCount = nonEmpty.filter(v => {
    try {
      const u = new URL(v)
      return u.protocol === 'http:' || u.protocol === 'https:'
    } catch {
      return false
    }
  }).length
  if (urlCount / nonEmpty.length > 0.7) return 'url'

  // Check boolean
  const boolValues = new Set(['true', 'false', 'yes', 'no', '1', '0', 'y', 'n'])
  if (nonEmpty.every(v => boolValues.has(String(v).toLowerCase()))) return 'boolean'

  // Check number (allow commas, currency symbols, percentages)
  const numericCount = nonEmpty.filter(v => {
    const cleaned = String(v).replace(/[$€£¥,\s%]/g, '')
    return cleaned !== '' && !isNaN(Number(cleaned))
  }).length
  if (numericCount / nonEmpty.length > 0.85) return 'number'

  // Check date
  const dateCount = nonEmpty.filter(v => {
    const s = String(v).trim()
    if (s.length < 6) return false
    const d = new Date(s)
    return !isNaN(d.getTime())
  }).length
  if (dateCount / nonEmpty.length > 0.8) return 'date'

  // Check category (low cardinality relative to total)
  const uniqueValues = new Set(nonEmpty.map(v => String(v)))
  const ratio = uniqueValues.size / nonEmpty.length
  if (uniqueValues.size <= 30 && ratio < 0.5) return 'category'

  return 'text'
}

export function analyzeColumn(name: string, values: string[]): ColumnInfo {
  const type = detectColumnType(values)
  const nullCount = values.filter(v => !v || String(v).trim() === '').length
  const nonEmpty = values.filter(v => v && String(v).trim() !== '').map(String)
  const fillRate = values.length > 0 ? ((values.length - nullCount) / values.length) * 100 : 0

  const info: ColumnInfo = {
    name,
    type,
    nullCount,
    totalCount: values.length,
    fillRate,
  }

  if (type === 'number') {
    const nums = nonEmpty.map(v => Number(String(v).replace(/[$€£¥,\s%]/g, '')))
    info.min = Math.min(...nums)
    info.max = Math.max(...nums)
    info.mean = nums.reduce((a, b) => a + b, 0) / nums.length
  }

  if (type === 'category' || type === 'boolean') {
    const uniqueValues = Array.from(new Set(nonEmpty))
    info.uniqueValues = uniqueValues
    info.uniqueCount = uniqueValues.length
  } else {
    info.uniqueCount = new Set(nonEmpty).size
  }

  return info
}

export function analyzeAllColumns(
  headers: string[],
  rows: Record<string, string>[]
): ColumnInfo[] {
  return headers.map(header => {
    const values = rows.map(row => row[header] || '')
    return analyzeColumn(header, values)
  })
}

export const TYPE_COLORS: Record<ColumnType, string> = {
  number: 'bg-emerald-100 text-emerald-800',
  date: 'bg-blue-100 text-blue-800',
  category: 'bg-purple-100 text-purple-800',
  text: 'bg-gray-100 text-gray-700',
  boolean: 'bg-orange-100 text-orange-800',
  url: 'bg-cyan-100 text-cyan-800',
}

export const TYPE_ICONS: Record<ColumnType, string> = {
  number: '#',
  date: '📅',
  category: '🏷',
  text: 'Aa',
  boolean: '✓',
  url: '🔗',
}
