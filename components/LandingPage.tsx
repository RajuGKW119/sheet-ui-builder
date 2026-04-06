'use client'

import { useState, useRef, useCallback, DragEvent, ChangeEvent } from 'react'
import {
  FileSpreadsheet,
  Link2,
  Upload,
  ArrowRight,
  Zap,
  BarChart2,
  Table2,
  Search,
  AlertCircle,
  Loader2,
  ChevronRight,
  Star,
} from 'lucide-react'
import { ParsedData, parseGoogleSheets, parseAnyFile } from '@/lib/parsers'

interface LandingPageProps {
  onDataLoaded: (data: ParsedData) => void
}

const EXAMPLE_SHEETS = [
  {
    label: 'Sample Sales Data',
    url: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit#gid=0',
    icon: '📊',
  },
]

export default function LandingPage({ onDataLoaded }: LandingPageProps) {
  const [url, setUrl] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleError = (msg: string) => {
    setError(msg)
    setLoading(false)
    setLoadingMessage('')
  }

  const handleGoogleSheets = async (sheetUrl: string) => {
    if (!sheetUrl.trim()) return
    setError('')
    setLoading(true)
    setLoadingMessage('Fetching your Google Sheet…')
    try {
      const data = await parseGoogleSheets(sheetUrl.trim())
      setLoading(false)
      onDataLoaded(data)
    } catch (err) {
      handleError(err instanceof Error ? err.message : 'Failed to load sheet.')
    }
  }

  const handleFile = async (file: File) => {
    setError('')
    setLoading(true)
    setLoadingMessage(`Parsing ${file.name}…`)
    try {
      const data = await parseAnyFile(file)
      if (data.rows.length === 0) {
        handleError('The file appears to be empty. Please check it has data rows.')
        return
      }
      setLoading(false)
      onDataLoaded(data)
    } catch (err) {
      handleError(err instanceof Error ? err.message : 'Failed to parse file.')
    }
  }

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }, [])

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = () => setIsDragging(false)

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (url.includes('docs.google.com/spreadsheets')) {
      handleGoogleSheets(url)
    } else {
      handleError('Please paste a valid Google Sheets URL.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <FileSpreadsheet className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-lg tracking-tight">Sheet UI Builder</span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-white text-sm transition-colors flex items-center gap-1"
          >
            <Star className="w-4 h-4" />
            Star on GitHub
          </a>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 animate-fade-in">
        {/* Badge */}
        <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 mb-8">
          <Zap className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-indigo-300 text-xs font-medium tracking-wide uppercase">
            No code · No signup · Instant dashboard
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl font-extrabold text-center text-white max-w-3xl leading-tight mb-4">
          Turn any spreadsheet into a{' '}
          <span className="gradient-text">beautiful dashboard</span>
        </h1>
        <p className="text-slate-400 text-lg text-center max-w-xl mb-12">
          Paste a Google Sheets link or drop a CSV / Excel file. Get a sortable table, smart charts,
          and instant insights — in seconds.
        </p>

        {/* Input Card */}
        <div className="w-full max-w-2xl">
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 shadow-2xl">
            {/* Google Sheets URL */}
            <form onSubmit={handleUrlSubmit} className="mb-4">
              <label className="block text-slate-300 text-sm font-medium mb-2">
                <Link2 className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                Paste a Google Sheets link
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={!url.trim() || loading}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-3 rounded-xl text-sm font-semibold transition-all"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  Go
                </button>
              </div>
              <p className="text-slate-500 text-xs mt-1.5">
                Sheet must be set to &quot;Anyone with the link can view&quot;
              </p>
            </form>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-slate-500 text-xs font-medium">OR</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Drop zone */}
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={() => !loading && fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'drop-zone-active border-indigo-400'
                  : 'border-white/20 hover:border-indigo-500/60 hover:bg-white/5'
              } ${loading ? 'pointer-events-none opacity-60' : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.xlsm,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={onFileChange}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-3">
                {loading ? (
                  <>
                    <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
                    <p className="text-slate-300 font-medium">{loadingMessage}</p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                      <Upload className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">
                        {isDragging ? 'Drop it here!' : 'Drop your file here'}
                      </p>
                      <p className="text-slate-500 text-sm mt-1">
                        CSV, Excel (.xlsx, .xls) — or click to browse
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-4 flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 animate-fade-in">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* Example sheets */}
          <div className="mt-4 flex flex-wrap items-center gap-2 justify-center">
            <span className="text-slate-500 text-xs">Try an example:</span>
            {EXAMPLE_SHEETS.map(s => (
              <button
                key={s.label}
                onClick={() => handleGoogleSheets(s.url)}
                disabled={loading}
                className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-3 py-1 text-xs text-slate-300 hover:text-white transition-all disabled:opacity-50"
              >
                <span>{s.icon}</span>
                {s.label}
                <ChevronRight className="w-3 h-3" />
              </button>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full">
          {[
            {
              icon: Table2,
              title: 'Sortable & Filterable Table',
              desc: 'Click any column header to sort. Search across all columns instantly.',
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10',
            },
            {
              icon: BarChart2,
              title: 'Auto-Generated Charts',
              desc: 'Smart column detection creates bar, line, and pie charts automatically.',
              color: 'text-indigo-400',
              bg: 'bg-indigo-500/10',
            },
            {
              icon: Search,
              title: 'Instant Insights',
              desc: 'Min, max, average, fill rates — all calculated at a glance.',
              color: 'text-purple-400',
              bg: 'bg-purple-500/10',
            },
          ].map(({ icon: Icon, title, desc, color, bg }) => (
            <div
              key={title}
              className="bg-white/5 border border-white/10 rounded-xl p-5 card-hover"
            >
              <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <h3 className="text-white font-semibold text-sm mb-1">{title}</h3>
              <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-slate-600 text-xs">
        Built with Next.js · Deploy free on Vercel · Open source
      </footer>
    </div>
  )
}
