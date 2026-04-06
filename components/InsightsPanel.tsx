'use client'

import { useState, useCallback } from 'react'
import { Sparkles, RefreshCw, Key, Loader2, AlertCircle, TrendingUp } from 'lucide-react'
import { ColumnInfo } from '@/lib/columnDetector'
import { buildInsightsPrompt } from '@/lib/dataContext'
import APIKeySetup, { useAPIKey } from './APIKeySetup'

interface InsightsPanelProps {
  headers: string[]
  rows: Record<string, string>[]
  columns: ColumnInfo[]
}

const INSIGHT_BG = [
  'from-indigo-50 to-indigo-100/50 border-indigo-200',
  'from-emerald-50 to-emerald-100/50 border-emerald-200',
  'from-violet-50 to-violet-100/50 border-violet-200',
  'from-amber-50 to-amber-100/50 border-amber-200',
  'from-cyan-50 to-cyan-100/50 border-cyan-200',
  'from-rose-50 to-rose-100/50 border-rose-200',
]

async function fetchInsights(
  headers: string[],
  rows: Record<string, string>[],
  columns: ColumnInfo[],
  apiKey: string
): Promise<string[]> {
  const systemPrompt = buildInsightsPrompt(headers, rows, columns)

  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'Generate the 6 insights now.' }],
      systemPrompt,
      apiKey,
      mode: 'insights',
    }),
  })

  const data = await res.json() as { content?: string; error?: string }
  if (!res.ok) throw new Error(data.error || 'Failed to generate insights')

  const lines = (data.content || '')
    .split('\n')
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 10)
    .slice(0, 6)

  if (lines.length === 0) throw new Error('No insights returned')
  return lines
}

export default function InsightsPanel({ headers, rows, columns }: InsightsPanelProps) {
  const { apiKey, saveKey } = useAPIKey()
  const [insights, setInsights] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showKeySetup, setShowKeySetup] = useState(false)
  const [generated, setGenerated] = useState(false)

  const generate = useCallback(async (key?: string) => {
    const k = key || apiKey
    if (!k) { setShowKeySetup(true); return }
    setLoading(true)
    setError('')
    try {
      const result = await fetchInsights(headers, rows, columns, k)
      setInsights(result)
      setGenerated(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate insights')
    } finally {
      setLoading(false)
    }
  }, [apiKey, headers, rows, columns])

  const handleKeySet = (key: string) => {
    saveKey(key)
    setShowKeySetup(false)
    generate(key)
  }

  if (showKeySetup) {
    return (
      <APIKeySetup
        onKeySet={handleKeySet}
        onClose={() => setShowKeySetup(false)}
      />
    )
  }

  // Empty state
  if (!generated && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-indigo-600" />
        </div>
        <div className="text-center">
          <h3 className="text-slate-800 font-bold text-lg mb-1">AI-Powered Insights</h3>
          <p className="text-slate-500 text-sm max-w-sm">
            Claude will analyze your {rows.length.toLocaleString()} rows and surface the most
            important patterns, trends, and anomalies.
          </p>
        </div>
        <button
          onClick={() => generate()}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all shadow-sm shadow-indigo-200"
        >
          <Sparkles className="w-4 h-4" />
          Generate Insights
        </button>
        {!apiKey && (
          <p className="text-slate-400 text-xs">You&apos;ll be asked for your Claude API key</p>
        )}
      </div>
    )
  }

  // Loading
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="relative">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          <Sparkles className="w-4 h-4 text-indigo-400 absolute -top-1 -right-1" />
        </div>
        <div className="text-center">
          <p className="text-slate-700 font-semibold">Claude is analyzing your data…</p>
          <p className="text-slate-400 text-sm mt-1">Reading {rows.length.toLocaleString()} rows across {columns.length} columns</p>
        </div>
        <div className="flex gap-1 mt-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    )
  }

  // Error
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 max-w-md">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-700 font-medium text-sm">Failed to generate insights</p>
            <p className="text-red-500 text-xs mt-1">{error}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => generate()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
          <button
            onClick={() => setShowKeySetup(true)}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium transition-all"
          >
            <Key className="w-3.5 h-3.5" /> Change API Key
          </button>
        </div>
      </div>
    )
  }

  // Results
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-slate-800">AI Insights</h3>
          <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-medium">
            Powered by Claude
          </span>
        </div>
        <button
          onClick={() => generate()}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-lg transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Regenerate
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {insights.map((insight, i) => (
          <div
            key={i}
            className={`bg-gradient-to-br ${INSIGHT_BG[i % INSIGHT_BG.length]} border rounded-xl p-4 animate-fade-in`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <p className="text-slate-700 text-sm leading-relaxed">{insight}</p>
          </div>
        ))}
      </div>

      <p className="text-slate-400 text-xs text-center pt-2">
        Based on {rows.length.toLocaleString()} rows · Analyzed by Claude AI
      </p>
    </div>
  )
}
