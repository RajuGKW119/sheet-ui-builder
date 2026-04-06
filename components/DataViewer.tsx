'use client'

import { useMemo, useState } from 'react'
import {
  FileSpreadsheet,
  BarChart2,
  Table2,
  ArrowLeft,
  Rows3,
  Columns3,
  Info,
  Hash,
  Calendar,
  Tag,
  Link,
  CheckSquare,
  Type,
} from 'lucide-react'
import { ParsedData } from '@/lib/parsers'
import { analyzeAllColumns, ColumnInfo, TYPE_COLORS, TYPE_ICONS } from '@/lib/columnDetector'
import DataTable from './DataTable'
import Charts from './Charts'

interface DataViewerProps {
  data: ParsedData
  onReset: () => void
}

type Tab = 'table' | 'charts' | 'summary'

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex flex-col gap-0.5 shadow-sm">
      <span className="text-xs text-slate-500 font-medium">{label}</span>
      <span className="text-2xl font-bold text-slate-800">{value}</span>
    </div>
  )
}

function ColumnCard({ col }: { col: ColumnInfo }) {
  const iconMap: Record<string, React.ReactNode> = {
    number: <Hash className="w-3.5 h-3.5" />,
    date: <Calendar className="w-3.5 h-3.5" />,
    category: <Tag className="w-3.5 h-3.5" />,
    boolean: <CheckSquare className="w-3.5 h-3.5" />,
    url: <Link className="w-3.5 h-3.5" />,
    text: <Type className="w-3.5 h-3.5" />,
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm font-semibold text-slate-800 truncate pr-2" title={col.name}>
          {col.name}
        </p>
        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${TYPE_COLORS[col.type]}`}>
          {iconMap[col.type]}
          {col.type}
        </span>
      </div>

      <div className="space-y-1.5 text-xs text-slate-500">
        {col.type === 'number' && col.min !== undefined && (
          <>
            <div className="flex justify-between">
              <span>Min</span>
              <span className="font-mono text-slate-700">{col.min?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Max</span>
              <span className="font-mono text-slate-700">{col.max?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Avg</span>
              <span className="font-mono text-slate-700">
                {col.mean?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
          </>
        )}
        {(col.type === 'category' || col.type === 'boolean') && (
          <>
            <div className="flex justify-between">
              <span>Unique values</span>
              <span className="font-mono text-slate-700">{col.uniqueCount}</span>
            </div>
            {col.uniqueValues && (
              <div className="flex flex-wrap gap-1 mt-1">
                {col.uniqueValues.slice(0, 5).map(v => (
                  <span
                    key={v}
                    className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-xs truncate max-w-[120px]"
                    title={v}
                  >
                    {v}
                  </span>
                ))}
                {(col.uniqueCount || 0) > 5 && (
                  <span className="text-slate-400 text-xs">+{(col.uniqueCount || 0) - 5} more</span>
                )}
              </div>
            )}
          </>
        )}
        <div className="flex justify-between pt-1 border-t border-slate-100">
          <span>Fill rate</span>
          <div className="flex items-center gap-1.5">
            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${col.fillRate}%`,
                  background: col.fillRate > 90 ? '#10b981' : col.fillRate > 60 ? '#f59e0b' : '#ef4444',
                }}
              />
            </div>
            <span className="font-mono text-slate-700">{col.fillRate.toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DataViewer({ data, onReset }: DataViewerProps) {
  const [activeTab, setActiveTab] = useState<Tab>('table')

  const columns = useMemo(
    () => analyzeAllColumns(data.headers, data.rows),
    [data.headers, data.rows]
  )

  const sourceLabel = useMemo(() => {
    if (data.source === 'google-sheets') return '📊 Google Sheet'
    if (data.source === 'excel') return `📗 ${data.fileName || 'Excel'}`
    return `📄 ${data.fileName || 'CSV'}`
  }, [data])

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'table', label: 'Table', icon: <Table2 className="w-4 h-4" /> },
    { id: 'charts', label: 'Charts', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'summary', label: 'Column Summary', icon: <Info className="w-4 h-4" /> },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              New
            </button>
            <div className="w-px h-5 bg-slate-200" />
            <div className="flex items-center gap-2 min-w-0">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span className="font-semibold text-slate-800 text-sm truncate">{sourceLabel}</span>
              {data.sheetTitle && data.sheetTitle !== 'Google Sheet' && (
                <span className="text-slate-400 text-sm truncate hidden sm:block">
                  · {data.sheetTitle}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-3 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <Rows3 className="w-3.5 h-3.5" />
                {data.rows.length.toLocaleString()} rows
              </span>
              <span className="flex items-center gap-1">
                <Columns3 className="w-3.5 h-3.5" />
                {data.headers.length} cols
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatPill label="Total Rows" value={data.rows.length.toLocaleString()} />
          <StatPill label="Columns" value={data.headers.length} />
          <StatPill
            label="Numeric Cols"
            value={columns.filter(c => c.type === 'number').length}
          />
          <StatPill
            label="Category Cols"
            value={columns.filter(c => c.type === 'category' || c.type === 'boolean').length}
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit mb-6 shadow-sm">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="animate-fade-in">
          {activeTab === 'table' && (
            <DataTable headers={data.headers} rows={data.rows} columns={columns} />
          )}

          {activeTab === 'charts' && (
            <Charts headers={data.headers} rows={data.rows} columns={columns} />
          )}

          {activeTab === 'summary' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {columns.map(col => (
                <ColumnCard key={col.name} col={col} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
