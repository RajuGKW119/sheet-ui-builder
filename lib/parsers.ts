import Papa from 'papaparse'

export interface ParsedData {
  headers: string[]
  rows: Record<string, string>[]
  source: string
  fileName?: string
  sheetTitle?: string
}

// ── CSV ─────────────────────────────────────────────────────────────────────

export async function parseCSVFile(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        const headers = (results.meta.fields || []).filter(Boolean)
        const rows = (results.data as Record<string, string>[]).map(row => {
          const cleaned: Record<string, string> = {}
          headers.forEach(h => { cleaned[h] = row[h] !== undefined ? String(row[h]) : '' })
          return cleaned
        })
        resolve({ headers, rows, source: 'csv', fileName: file.name })
      },
      error: (err: { message: string }) => reject(new Error(`CSV parse error: ${err.message}`)),
    })
  })
}

export async function parseCSVText(text: string, fileName?: string): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        const headers = (results.meta.fields || []).filter(Boolean)
        const rows = (results.data as Record<string, string>[]).map(row => {
          const cleaned: Record<string, string> = {}
          headers.forEach(h => { cleaned[h] = row[h] !== undefined ? String(row[h]) : '' })
          return cleaned
        })
        resolve({ headers, rows, source: 'csv', fileName })
      },
      error: (err: { message: string }) => reject(new Error(`CSV parse error: ${err.message}`)),
    })
  })
}

// ── Excel ────────────────────────────────────────────────────────────────────

export async function parseExcelFile(file: File): Promise<ParsedData> {
  // Dynamic import to avoid SSR issues
  const XLSX = await import('xlsx')

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]

        const jsonData = XLSX.utils.sheet_to_json<(string | number | boolean | Date)[]>(sheet, {
          header: 1,
          defval: '',
          raw: false,
        })

        if (!jsonData || jsonData.length < 2) {
          reject(new Error('Excel file appears empty or has no data rows.'))
          return
        }

        const headers = (jsonData[0] as string[]).map(h => String(h || '').trim()).filter(Boolean)
        const dataRows = jsonData.slice(1) as (string | number | boolean | Date)[][]

        const rows = dataRows.map(row => {
          const obj: Record<string, string> = {}
          headers.forEach((h, i) => {
            const val = row[i]
            if (val instanceof Date) {
              obj[h] = val.toISOString().split('T')[0]
            } else {
              obj[h] = val !== undefined && val !== null ? String(val) : ''
            }
          })
          return obj
        })

        resolve({
          headers,
          rows,
          source: 'excel',
          fileName: file.name,
          sheetTitle: sheetName,
        })
      } catch (err) {
        reject(new Error(`Excel parse error: ${err instanceof Error ? err.message : 'Unknown error'}`))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsBinaryString(file)
  })
}

// ── Google Sheets ─────────────────────────────────────────────────────────────

export function extractSheetId(url: string): { id: string; gid: string } | null {
  const trimmed = url.trim()
  // Match spreadsheet ID from various URL formats
  const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (!idMatch) return null

  const gidMatch = trimmed.match(/[#&?]gid=(\d+)/)
  return {
    id: idMatch[1],
    gid: gidMatch ? gidMatch[1] : '0',
  }
}

export async function parseGoogleSheets(url: string): Promise<ParsedData> {
  const info = extractSheetId(url)
  if (!info) {
    throw new Error(
      'Invalid Google Sheets URL. It should look like: https://docs.google.com/spreadsheets/d/...'
    )
  }

  const proxyUrl = `/api/sheets?id=${encodeURIComponent(info.id)}&gid=${encodeURIComponent(info.gid)}`
  let response: Response
  try {
    response = await fetch(proxyUrl)
  } catch {
    throw new Error('Network error — could not reach Google Sheets.')
  }

  if (!response.ok) {
    let msg = 'Failed to fetch the Google Sheet.'
    if (response.status === 403 || response.status === 401) {
      msg = 'Access denied. Make sure the sheet is set to "Anyone with the link can view".'
    } else if (response.status === 404) {
      msg = 'Sheet not found. Check the URL and try again.'
    }
    throw new Error(msg)
  }

  const csvText = await response.text()

  if (!csvText || csvText.trim() === '') {
    throw new Error('The sheet appears to be empty.')
  }

  const data = await parseCSVText(csvText, 'Google Sheet')
  return { ...data, source: 'google-sheets', sheetTitle: 'Google Sheet' }
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

export async function parseAnyFile(file: File): Promise<ParsedData> {
  const ext = file.name.split('.').pop()?.toLowerCase()

  if (ext === 'csv' || file.type === 'text/csv') {
    return parseCSVFile(file)
  }

  if (
    ext === 'xlsx' ||
    ext === 'xls' ||
    ext === 'xlsm' ||
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.type === 'application/vnd.ms-excel'
  ) {
    return parseExcelFile(file)
  }

  // Try CSV as fallback
  return parseCSVFile(file)
}
