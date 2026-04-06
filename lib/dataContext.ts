import { ColumnInfo } from './columnDetector'

const MAX_SAMPLE_ROWS = 40

export function buildDataContext(
  headers: string[],
  rows: Record<string, string>[],
  columns: ColumnInfo[]
): string {
  const numericCols = columns.filter(c => c.type === 'number')
  const categoryCols = columns.filter(c => c.type === 'category' || c.type === 'boolean')
  const dateCols = columns.filter(c => c.type === 'date')

  // Column descriptions with stats
  const colDesc = columns
    .map(c => {
      let line = `  • ${c.name} [${c.type}]`
      if (c.type === 'number' && c.min !== undefined) {
        line += ` — min: ${c.min?.toLocaleString()}, max: ${c.max?.toLocaleString()}, avg: ${c.mean?.toFixed(1)}`
      }
      if ((c.type === 'category' || c.type === 'boolean') && c.uniqueValues) {
        const vals = c.uniqueValues.slice(0, 10).join(', ')
        line += ` — values: ${vals}${(c.uniqueCount || 0) > 10 ? ` (+${(c.uniqueCount || 0) - 10} more)` : ''}`
      }
      if (c.type === 'date') {
        const dates = rows.map(r => r[c.name]).filter(Boolean).sort()
        if (dates.length > 0) line += ` — from ${dates[0]} to ${dates[dates.length - 1]}`
      }
      return line
    })
    .join('\n')

  // Sample rows as compact CSV
  const sample = rows.slice(0, MAX_SAMPLE_ROWS)
  const csvHeader = headers.join('\t')
  const csvRows = sample
    .map(row => headers.map(h => row[h] || '').join('\t'))
    .join('\n')

  // Aggregate stats for numeric columns
  const numericStats = numericCols
    .map(c => {
      const vals = rows
        .map(r => Number(String(r[c.name] || '').replace(/[$€£¥,\s%]/g, '')))
        .filter(n => !isNaN(n))
      const total = vals.reduce((a, b) => a + b, 0)
      return `  • ${c.name}: total=${total.toLocaleString()}, count=${vals.length}`
    })
    .join('\n')

  // Category frequency
  const catStats = categoryCols
    .map(c => {
      const freq: Record<string, number> = {}
      rows.forEach(r => {
        const v = r[c.name] || '(empty)'
        freq[v] = (freq[v] || 0) + 1
      })
      const sorted = Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ')
      return `  • ${c.name}: ${sorted}`
    })
    .join('\n')

  return `You are an expert data analyst. The user has uploaded a spreadsheet dataset. Here are the full details:

═══ DATASET OVERVIEW ═══
Total rows: ${rows.length.toLocaleString()}
Total columns: ${headers.length}
Column names: ${headers.join(', ')}

═══ COLUMN DETAILS ═══
${colDesc}

${numericStats ? `═══ NUMERIC TOTALS (all ${rows.length} rows) ═══\n${numericStats}\n` : ''}
${catStats ? `═══ CATEGORY FREQUENCIES (all ${rows.length} rows) ═══\n${catStats}\n` : ''}
═══ SAMPLE DATA (first ${Math.min(MAX_SAMPLE_ROWS, rows.length)} rows) ═══
${csvHeader}
${csvRows}

INSTRUCTIONS:
- Answer questions about this data accurately and concisely
- For calculations, use the aggregate stats above (not just sample rows) when available
- Format numbers with commas for readability
- When listing items, use bullet points
- Keep responses focused and under 300 words unless the user asks for detail
- If asked for a chart or visualization, describe what you'd show in words`
}

export function buildInsightsPrompt(
  headers: string[],
  rows: Record<string, string>[],
  columns: ColumnInfo[]
): string {
  const ctx = buildDataContext(headers, rows, columns)
  return `${ctx}

Based on this dataset, generate exactly 6 sharp, specific data insights. Each insight should:
- Be a concrete observation (include specific numbers/percentages)
- Start with a relevant emoji
- Be 1-2 sentences max
- Highlight something actionable, surprising, or important

Format your response as exactly 6 lines, each starting with an emoji. No headers, no extra text, just the 6 insight lines.`
}

export function buildSuggestedQuestions(columns: ColumnInfo[]): string[] {
  const questions: string[] = []
  const numCols = columns.filter(c => c.type === 'number')
  const catCols = columns.filter(c => c.type === 'category' || c.type === 'boolean')
  const dateCols = columns.filter(c => c.type === 'date')

  if (numCols.length > 0) {
    questions.push(`What is the total ${numCols[0].name}?`)
    if (numCols.length > 1) questions.push(`Which ${numCols[0].name} is highest?`)
  }
  if (catCols.length > 0 && numCols.length > 0) {
    questions.push(`Which ${catCols[0].name} has the highest ${numCols[0].name}?`)
    questions.push(`What is the breakdown of ${catCols[0].name}?`)
  }
  if (dateCols.length > 0 && numCols.length > 0) {
    questions.push(`What is the trend of ${numCols[0].name} over time?`)
  }
  questions.push('What are the key takeaways from this data?')
  questions.push('Are there any anomalies or outliers?')

  return questions.slice(0, 5)
}
