'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { ParsedData } from '@/lib/parsers'
import LandingPage from '@/components/LandingPage'

// Dynamic import for DataViewer to avoid SSR issues with recharts + xlsx
const DataViewer = dynamic(() => import('@/components/DataViewer'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-sm">Loading dashboard…</p>
      </div>
    </div>
  ),
})

export default function Home() {
  const [data, setData] = useState<ParsedData | null>(null)

  const handleDataLoaded = (parsed: ParsedData) => {
    setData(parsed)
  }

  const handleReset = () => {
    setData(null)
  }

  if (data) {
    return <DataViewer data={data} onReset={handleReset} />
  }

  return <LandingPage onDataLoaded={handleDataLoaded} />
}
