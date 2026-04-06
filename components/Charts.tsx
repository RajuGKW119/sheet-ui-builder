'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts'
import { BarChart2, PieChart as PieIcon, TrendingUp } from 'lucide-react'
import { ColumnInfo } from '@/lib/columnDetector'

interface ChartsProps {
  headers: string[]
  rows: Record<string, string>[]
  columns: ColumnInfo[]
}

const PALETTE = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#14b8a6', '#84cc16', '#f97316',
]

const TOOLTIP_STYLE = {
  backgroundColor: '#1e293b',
  border: 'none',
  borderRadius: '8px',
  color: '#f8fafc',
  fontSize: 12,
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildBarData(
  col: ColumnInfo,
  rows: Record<string, string>[],
  valueCol?: ColumnInfo
): { name: string; value: number }[] {
  if (col.type === 'category' || col.type === 'boolean') {
    const freq: Record<string, number> = {}
    rows.forEach(row => {
      const key = String(row[col.name] || '(empty)').trim()
      if (valueCol && valueCol.type === 'number') {
        const num = Number(String(row[valueCol.name] || '0').replace(/[$€£¥,\s%]/g, ''))
        freq[key] = (freq[key] || 0) + (isNaN(num) ? 0 : num)
      } else {
        freq[key] = (freq[key] || 0) + 1
      }
    })
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, value]) => ({ name, value }))
  }
  return []
}

function buildNumericBar(col: ColumnInfo, rows: Record<string, string>[]): { name: string; value: number }[] {
  // Show top 15 rows by value
  return rows
    .map((row, i) => ({
      name: String(Object.values(row)[0] || `Row ${i + 1}`).slice(0, 20),
      value: Number(String(row[col.name] || '0').replace(/[$€£¥,\s%]/g, '')),
    }))
    .filter(d => !isNaN(d.value))
    .sort((a, b) => b.value - a.value)
    .slice(0, 15)
}

function buildTimeSeriesData(
  dateCol: ColumnInfo,
  numCol: ColumnInfo,
  rows: Record<string, string>[]
): { date: string; value: number }[] {
  const agg: Record<string, number> = {}
  rows.forEach(row => {
    const d = row[dateCol.name]
    const v = Number(String(row[numCol.name] || '0').replace(/[$€£¥,\s%]/g, ''))
    if (d && !isNaN(v)) {
      const key = d.slice(0, 10)
      agg[key] = (agg[key] || 0) + v
    }
  })
  return Object.entries(agg)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(0, 60)
    .map(([date, value]) => ({ date, value }))
}

// ── Chart Components ──────────────────────────────────────────────────────────

function PieChartCard({ col, rows }: { col: ColumnInfo; rows: Record<string, string>[] }) {
  const data = useMemo(() => buildBarData(col, rows), [col, rows])
  if (data.length < 2 || data.length > 12) return null
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <ChartCard title={`${col.name} Distribution`} icon={<PieIcon className="w-4 h-4" />}>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            innerRadius={40}
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) => `${String(name).slice(0, 12)} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(val: number) => [`${val} (${((val / total) * 100).toFixed(1)}%)`, '']}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-1.5 mt-2 px-2">
        {data.slice(0, 6).map((d, i) => (
          <span
            key={d.name}
            className="flex items-center gap-1 text-xs text-slate-600"
          >
            <span
              className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: PALETTE[i % PALETTE.length] }}
            />
            {String(d.name).slice(0, 20)}
          </span>
        ))}
      </div>
    </ChartCard>
  )
}

function BarChartCard({
  col,
  rows,
  label,
}: {
  col: ColumnInfo
  rows: Record<string, string>[]
  label?: string
}) {
  const data = useMemo(() => buildBarData(col, rows), [col, rows])
  if (data.length < 2) return null

  return (
    <ChartCard title={label || `${col.name} Frequency`} icon={<BarChart2 className="w-4 h-4" />}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#64748b' }}
            angle={-35}
            textAnchor="end"
            interval={0}
          />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} width={40} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="value" fill={PALETTE[0]} radius={[3, 3, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function NumericBarCard({ col, rows }: { col: ColumnInfo; rows: Record<string, string>[] }) {
  const labelCol = rows.length > 0 ? Object.keys(rows[0])[0] : null
  const data = useMemo(() => {
    return rows
      .map(row => ({
        name: labelCol ? String(row[labelCol] || '').slice(0, 20) : '?',
        value: Number(String(row[col.name] || '0').replace(/[$€£¥,\s%]/g, '')),
      }))
      .filter(d => !isNaN(d.value) && d.value !== 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 12)
  }, [col, rows, labelCol])

  if (data.length < 2) return null

  return (
    <ChartCard title={`Top ${col.name}`} icon={<BarChart2 className="w-4 h-4" />}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: '#64748b' }}
            width={90}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="value" fill={PALETTE[2]} radius={[0, 3, 3, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[(i + 2) % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function TimeSeriesCard({
  dateCol,
  numCol,
  rows,
}: {
  dateCol: ColumnInfo
  numCol: ColumnInfo
  rows: Record<string, string>[]
}) {
  const data = useMemo(() => buildTimeSeriesData(dateCol, numCol, rows), [dateCol, numCol, rows])
  if (data.length < 3) return null

  return (
    <ChartCard
      title={`${numCol.name} over time`}
      icon={<TrendingUp className="w-4 h-4" />}
      wide
    >
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#64748b' }}
            angle={-35}
            textAnchor="end"
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} width={50} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={PALETTE[0]}
            strokeWidth={2}
            dot={data.length < 20}
            name={numCol.name}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// ── Wrapper ───────────────────────────────────────────────────────────────────

function ChartCard({
  title,
  icon,
  children,
  wide,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 p-4 shadow-sm ${
        wide ? 'col-span-full sm:col-span-2' : ''
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-slate-400">{icon}</span>
        <h3 className="text-sm font-semibold text-slate-700 truncate">{title}</h3>
      </div>
      {children}
    </div>
  )
}

// ── Main Export ───────────────────────────────────────────────────────────────

export default function Charts({ headers, rows, columns }: ChartsProps) {
  const categoryColumns = columns.filter(c => c.type === 'category' || c.type === 'boolean')
  const numberColumns = columns.filter(c => c.type === 'number')
  const dateColumns = columns.filter(c => c.type === 'date')

  // Determine which charts to show
  const charts: React.ReactNode[] = []

  // Time series first (most valuable)
  if (dateColumns.length > 0 && numberColumns.length > 0) {
    charts.push(
      <TimeSeriesCard
        key={`ts-${dateColumns[0].name}-${numberColumns[0].name}`}
        dateCol={dateColumns[0]}
        numCol={numberColumns[0]}
        rows={rows}
      />
    )
  }

  // Category bars / pies
  categoryColumns.slice(0, 4).forEach(col => {
    if ((col.uniqueCount || 0) <= 6) {
      charts.push(<PieChartCard key={`pie-${col.name}`} col={col} rows={rows} />)
    } else {
      charts.push(<BarChartCard key={`bar-${col.name}`} col={col} rows={rows} />)
    }
  })

  // Numeric horizontal bars (top items by first numeric column)
  if (numberColumns.length > 0 && categoryColumns.length === 0) {
    numberColumns.slice(0, 2).forEach(col => {
      charts.push(<NumericBarCard key={`num-${col.name}`} col={col} rows={rows} />)
    })
  }

  if (charts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
        No chart-able data detected. Try data with numeric or category columns.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {charts}
    </div>
  )
}
