'use client'

import { useState, useMemo } from 'react'
import { LayoutGrid, Download } from 'lucide-react'
import { ColumnInfo } from '@/lib/columnDetector'

interface PivotTableProps {
  headers: string[]
  rows: Record<string, string>[]
  columns: ColumnInfo[]
}

type AggType = 'sum' | 'count' | 'avg' | 'min' | 'max'

const AGG_LABELS: Record<AggType, string> = {
  sum: 'Sum', count: 'Count', avg: 'Average', min: 'Min', max: 'Max',
}

function aggregate(values: number[], type: AggType): number {
  if (values.length === 0) return 0
  switch (type) {
    case 'sum': return values.reduce((a, b) => a + b, 0)
    case 'count': return values.length
    case 'avg': return values.reduce((a, b) => a + b, 0) / values.length
    case 'min': return Math.min(...values)
    case 'max': return Math.max(...values)
  }
}

function parseNum(val: string): number | null {
  const n = Number(String(val || '').replace(/[$€£¥,\s%]/g, ''))
  return isNaN(n) ? null : n
}

function fmt(val: number, agg: AggType): string {
  if (agg === 'count') return val.toLocaleString()
  if (agg === 'avg') return val.toLocaleString(undefined, { maximumFractionDigits: 1 })
  return val.toLocaleString(undefined, { maximumFractionDigits: 0 })
}

export default function PivotTable({ headers, rows, columns }: PivotTableProps) {
  const catCols = columns.filter(c => c.type === 'category' || c.type === 'boolean' || c.type === 'date' || c.type === 'text')
  const numCols = columns.filter(c => c.type === 'number')

  const [rowDim, setRowDim] = useState<string>(catCols[0]?.name || headers[0])
  const [colDim, setColDim] = useState<string>('(none)')
  const [valueDim, setValueDim] = useState<string>(numCols[0]?.name || '')
  const [agg, setAgg] = useState<AggType>('sum')

  // Build pivot
  const pivot = useMemo(() => {
    if (!rowDim || (!valueDim && agg !== 'count')) return null

    const useCount = agg === 'count'
    const colValues = colDim !== '(none)'
      ? Array.from(new Set(rows.map(r => String(r[colDim] || '(empty)')))).sort()
      : null

    // Group rows by rowDim (and optionally colDim)
    const grouped: Record<string, Record<string, number[]>> = {}

    rows.forEach(row => {
      const rKey = String(row[rowDim] || '(empty)')
      const cKey = colDim !== '(none)' ? String(row[colDim] || '(empty)') : '__all__'
      const numVal = useCount ? 1 : parseNum(row[valueDim])

      if (!grouped[rKey]) grouped[rKey] = {}
      if (!grouped[rKey][cKey]) grouped[rKey][cKey] = []
      if (useCount) {
        grouped[rKey][cKey].push(1)
      } else if (numVal !== null) {
        grouped[rKey][cKey].push(numVal)
      }
    })

    const rowKeys = Object.keys(grouped).sort()
    const colKeys = colValues || ['__all__']

    // Compute aggregated values
    const data = rowKeys.map(rk => {
      const cells = colKeys.map(ck => {
        const vals = grouped[rk]?.[ck] || []
        return vals.length > 0 ? aggregate(vals, agg) : null
      })
      const rowTotal = aggregate(
        cells.filter((v): v is number => v !== null),
        agg === 'avg' ? 'avg' : agg
      )
      return { rowKey: rk, cells, rowTotal }
    })

    // Col totals
    const colTotals = colKeys.map((_, ci) => {
      const vals = data.map(r => r.cells[ci]).filter((v): v is number => v !== null)
      return vals.length > 0 ? aggregate(vals, agg === 'avg' ? 'avg' : agg) : null
    })
    const grandTotal = aggregate(
      data.map(r => r.rowTotal).filter(v => !isNaN(v)),
      agg === 'avg' ? 'avg' : agg
    )

    // Find max for heatmap
    const allVals = data.flatMap(r => r.cells.filter((v): v is number => v !== null))
    const maxVal = allVals.length > 0 ? Math.max(...allVals) : 1

    return { data, colKeys: colValues ? colKeys : null, colTotals, grandTotal, maxVal }
  }, [rowDim, colDim, valueDim, agg, rows])

  const exportCSV = () => {
    if (!pivot) return
    const cols = pivot.colKeys ? pivot.colKeys : [valueDim || 'Count']
    const header = [rowDim, ...cols, 'Total'].join(',')
    const body = pivot.data
      .map(r => [
        `"${r.rowKey}"`,
        ...r.cells.map(v => v !== null ? v.toFixed(0) : ''),
        r.rowTotal.toFixed(0),
      ].join(','))
      .join('\n')
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'pivot.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const getHeat = (val: number | null, max: number): string => {
    if (val === null || max === 0) return ''
    const intensity = Math.round((val / max) * 9)
    const colors = [
      '', 'bg-indigo-50', 'bg-indigo-100', 'bg-indigo-100',
      'bg-indigo-200', 'bg-indigo-200', 'bg-indigo-300',
      'bg-indigo-300', 'bg-indigo-400', 'bg-indigo-500',
    ]
    return colors[intensity] || ''
  }

  const getTextColor = (val: number | null, max: number): string => {
    if (val === null || max === 0) return 'text-slate-700'
    const intensity = (val / max)
    return intensity > 0.6 ? 'text-indigo-900 font-semibold' : 'text-slate-700'
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <LayoutGrid className="w-4 h-4 text-indigo-600" />
          <h3 className="font-bold text-slate-800 text-sm">Pivot Table Builder</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Row Dimension</label>
            <select
              value={rowDim}
              onChange={e => setRowDim(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {headers.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Column Dimension</label>
            <select
              value={colDim}
              onChange={e => setColDim(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="(none)">(none)</option>
              {headers.filter(h => h !== rowDim).map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Value Column</label>
            <select
              value={valueDim}
              onChange={e => setValueDim(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={agg === 'count'}
            >
              {numCols.length > 0
                ? numCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)
                : headers.map(h => <option key={h} value={h}>{h}</option>)
              }
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Aggregation</label>
            <select
              value={agg}
              onChange={e => setAgg(e.target.value as AggType)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {Object.entries(AGG_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {pivot && pivot.data.length > 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-700">
              {AGG_LABELS[agg]} of {agg === 'count' ? 'rows' : valueDim} by {rowDim}
              {colDim !== '(none)' ? ` × ${colDim}` : ''}
            </span>
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-lg transition-all"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>

          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-800">
                  <th className="text-left px-4 py-2.5 text-white font-semibold text-xs sticky left-0 bg-slate-800 min-w-[140px]">
                    {rowDim}
                  </th>
                  {(pivot.colKeys || [valueDim || 'Count']).map(ck => (
                    <th key={ck} className="px-3 py-2.5 text-white font-semibold text-xs text-right whitespace-nowrap">
                      {ck === '__all__' ? (valueDim || 'Count') : ck}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-white font-semibold text-xs text-right bg-slate-700 whitespace-nowrap">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {pivot.data.map((row, ri) => (
                  <tr key={row.rowKey} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    <td className="px-4 py-2 text-slate-700 text-xs font-medium sticky left-0 bg-inherit border-r border-slate-100 max-w-[200px] truncate" title={row.rowKey}>
                      {row.rowKey}
                    </td>
                    {row.cells.map((val, ci) => (
                      <td
                        key={ci}
                        className={`px-3 py-2 text-right text-xs font-mono ${getHeat(val, pivot.maxVal)} ${getTextColor(val, pivot.maxVal)}`}
                      >
                        {val !== null ? fmt(val, agg) : <span className="text-slate-300">—</span>}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right text-xs font-mono font-bold text-slate-800 bg-slate-100">
                      {fmt(row.rowTotal, agg)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-800 text-white">
                  <td className="px-4 py-2.5 text-xs font-bold sticky left-0 bg-slate-800">Total</td>
                  {pivot.colTotals.map((val, ci) => (
                    <td key={ci} className="px-3 py-2.5 text-right text-xs font-bold font-mono">
                      {val !== null ? fmt(val, agg) : '—'}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-right text-xs font-bold font-mono bg-slate-700">
                    {fmt(pivot.grandTotal, agg)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400">
            {pivot.data.length} groups · {rows.length.toLocaleString()} total rows · Heatmap shows relative values
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          Select dimensions above to build your pivot table.
        </div>
      )}
    </div>
  )
}
