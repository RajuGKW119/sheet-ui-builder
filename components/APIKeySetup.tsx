'use client'

import { useState, useEffect } from 'react'
import { Key, Eye, EyeOff, ExternalLink, CheckCircle, X } from 'lucide-react'

const STORAGE_KEY = 'sheet_ui_claude_key'

interface APIKeySetupProps {
  onKeySet: (key: string) => void
  onClose?: () => void
  inline?: boolean
}

export function useAPIKey() {
  const [apiKey, setApiKey] = useState<string>('')

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY) || ''
      setApiKey(stored)
    } catch {
      // ignore
    }
  }, [])

  const saveKey = (key: string) => {
    try {
      if (key) sessionStorage.setItem(STORAGE_KEY, key)
      else sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    setApiKey(key)
  }

  return { apiKey, saveKey }
}

export default function APIKeySetup({ onKeySet, onClose, inline = false }: APIKeySetupProps) {
  const [input, setInput] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    const key = input.trim()
    if (!key) { setError('Please enter your API key.'); return }
    if (!key.startsWith('sk-ant-')) {
      setError('Claude API keys start with "sk-ant-". Check and try again.')
      return
    }
    setError('')
    setSaved(true)
    onKeySet(key)
    setTimeout(() => {
      if (onClose) onClose()
    }, 800)
  }

  const containerClass = inline
    ? 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm'
    : 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4'

  const card = inline ? '' : 'bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md relative'

  return (
    <div className={containerClass}>
      <div className={card}>
        {!inline && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Key className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-base">Claude API Key</h2>
            <p className="text-slate-500 text-xs">Required for AI features</p>
          </div>
        </div>

        <p className="text-slate-600 text-sm mb-4">
          Your key is stored only in your browser session and never saved to any server.
        </p>

        <div className="relative mb-3">
          <input
            type={show ? 'text' : 'password'}
            value={input}
            onChange={e => { setInput(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="sk-ant-api03-..."
            className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saved}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-emerald-500 text-white py-2.5 rounded-xl text-sm font-semibold transition-all"
        >
          {saved ? (
            <><CheckCircle className="w-4 h-4" /> Key Saved!</>
          ) : (
            'Save & Enable AI Features'
          )}
        </button>

        <a
          href="https://console.anthropic.com/settings/api-keys"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1 text-indigo-500 hover:text-indigo-700 text-xs mt-3 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Get your API key at console.anthropic.com
        </a>
      </div>
    </div>
  )
}
