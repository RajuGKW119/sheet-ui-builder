'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  X,
  Download,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { ColumnInfo, TYPE_COLORS, TYPE_ICONS } from '@/lib/columnDetector'

interface DataTableProps {
  headers: string[]
  rows: Record<string, string>[]
  columns: ColumnInfo[]
}

type SortDir = 'asc' | 'desc' | null

const PAGE_SIZES = [25, 50, 100, 250]
const CELL_MAX_WIDTH = 260

function formatCellValue(value: string, type: string): React.ReactNode {
  if (!value || value.trim() === '') {
    return <span className="text-slate-300">—</span>
  }

  if (type === 'url') {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="text-indigo-600 hover:underline text-xs truncate block"
        style={{ maxWidth: CELL_MAX_WIDTH }}
        title={value}
      >
        {value}
      </a>
    )
  }

  if (type === 'boolean') {
    const truthy = ['true', 'yes', '1', 'y'].includes(value.toLowerCase())
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          truthy ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
        }`}
      >
        {truthy ? '✓ Yes' : '✗ No'}
      </span>
    )
  }

  if (type === 'number') {
    const num = Number(value.replace(/[$€£¥,\s%]/g, ''))
    if (!isNaN(num)) {
      return (
        <span className="font-mono text-right block text-slate-700">
          {value.includes('%')
            ? `${num.toFixed(1)}%`
            : value.match(/[$€£¥]/)
            ? value
            : num.toLocaleString()}
        </span>
      )
    }
  }

  return (
    <span
      className="text-slate-700 text-xs truncate block"
      style={{ maxWidth: CELL_MAX_WIDTH }}
      title={value}
    >
      {value}
    </span>
  )
}

export default function DataTable({ headers, rows, columns }: DataTableProps) {
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])
  const [colFilters, setColFilters] = useState<Record<string, string>>({})

  const colMap = useMemo(
    () => Object.fromEntries(columns.map(c => [c.name, c])),
    [columns]
  )

  const handleSort = useCallback(
    (col: string) => {
      if (sortCol !== col) {
        setSortCol(col)
        setSortDir('asc')
      } else if (sortDir === 'asc') {
        setSortDir('desc')
      } else {
        setSortCol(null)
        setSortDir(null)
      }
      setPage(0)
    },
    [sortCol, sortDir]
  )

  const filteredRows = useMemo(() => {
    let result = rows

    // Global search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(row =>
        headers.some(h => String(row[h] || '').toLowerCase().includes(q))
      )
    }

    // Column filters
    Object.entries(colFilters).forEach(([col, val]) => {
      if (val) {
        result = result.filter(row =>
          String(row[col] || '').toLowerCase().includes(val.toLowerCase())
        )
      }
    })

    return result
  }, [rows, search, headers, colFilters])

  const sortedRows = useMemo(() => {
    if (!sortCol || !sortDir) return filteredRows
    const col = colMap[sortCol]
    return [...filteredRows].sort((a, b) => {
      const av = a[sortCol] || ''
      const bv = b[sortCol] || ''

      let cmp = 0
      if (col?.type === 'number') {
        const an = Number(av.replace(/[$€£¥,\s%]/g, ''))
        const bn = Number(bv.replace(/[$€£¥,\s%]/g, ''))
        cmp = isNaN(an) || isNaN(bn) ? av.localeCompare(bv) : an - bn
      } else if (col?.type === 'date') {
        cmp = new Date(av || 0).getTime() - new Date(bv || 0).getTime()
      } else {
        cmp = av.localeCompare(bv)
      }

      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filteredRows, sortCol, sortDir, colMap])

  const totalPages = Math.ceil(sortedRows.length / pageSize)
  const pageRows = sortedRows.slice(page * pageSize, page * pageSize + pageSize)

  const exportCSV = () => {
    const header = headers.join(',')
    const body = sortedRows
      .map(row => headers.map(h => `"${(row[h] || '').replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sheet-export.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const SortIcon = ({ col }: { col: string }) => {
    if (sortCol !== col) return <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
    if (sortDir === 'asc') return <ChevronUp className="w-3.5 h-3.5 text-indigo-600" />
    return <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            placeholder="Search all columns…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-sm">
            {filteredRows.length.toLocaleString()}{' '}
            {filteredRows.length !== rows.length && `of ${rows.length.toLocaleString()} `}
            rows
          </span>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 px-3 py-2 rounded-xl text-sm font-medium transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="data-table w-full text-sm">
            <thead>
              <tr>
                {headers.map(h => {
                  const colInfo = colMap[h]
                  return (
                    <th
                      key={h}
                      onClick={() => handleSort(h)}
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors select-none whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                            TYPE_COLORS[colInfo?.type || 'text']
                          }`}
                        >
                          {TYPE_ICONS[colInfo?.type || 'text']}
                        </span>
                        <span className="truncate" style={{ maxWidth: 160 }} title={h}>
                          {h}
                        </span>
                        <SortIcon col={h} />
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={headers.length}
                    className="px-4 py-12 text-center text-slate-400 text-sm"
                  >
                    No rows match your search.
                  </td>
                </tr>
              ) : (
                pageRows.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    {headers.map(h => (
                      <td key={h} className="px-4 py-2.5">
                        {formatCellValue(row[h] || '', colMap[h]?.type || 'text')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-sm">Rows per page:</span>
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(0) }}
            className="border border-slate-200 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {PAGE_SIZES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 text-sm">
            Page {totalPages === 0 ? 0 : page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:border-slate-300 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:border-slate-300 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
