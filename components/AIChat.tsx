'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  Send, Bot, User, Key, Loader2, AlertCircle, Lightbulb, Trash2, Copy, Check
} from 'lucide-react'
import { ColumnInfo } from '@/lib/columnDetector'
import { buildDataContext, buildSuggestedQuestions } from '@/lib/dataContext'
import APIKeySetup, { useAPIKey } from './APIKeySetup'

interface Message {
  role: 'user' | 'assistant'
  content: string
  error?: boolean
}

interface AIChatProps {
  headers: string[]
  rows: Record<string, string>[]
  columns: ColumnInfo[]
}

async function callClaude(
  messages: Message[],
  systemPrompt: string,
  apiKey: string
): Promise<string> {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: messages
        .filter(m => !m.error)
        .map(m => ({ role: m.role, content: m.content })),
      systemPrompt,
      apiKey,
      mode: 'chat',
    }),
  })

  const data = await res.json() as { content?: string; error?: string }
  if (!res.ok) throw new Error(data.error || 'API error')
  return data.content || ''
}

function MessageBubble({ msg, isLast }: { msg: Message; isLast: boolean }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(msg.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (msg.role === 'user') {
    return (
      <div className="flex justify-end gap-2 group">
        <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%] text-sm leading-relaxed">
          {msg.content}
        </div>
        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <User className="w-3.5 h-3.5 text-indigo-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-2 group">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bot className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div
          className={`rounded-2xl rounded-tl-sm px-4 py-3 max-w-full text-sm leading-relaxed whitespace-pre-wrap ${
            msg.error
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-white border border-slate-200 text-slate-700'
          }`}
        >
          {msg.content}
        </div>
        {!msg.error && (
          <button
            onClick={copy}
            className="mt-1 ml-1 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-all"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function AIChat({ headers, rows, columns }: AIChatProps) {
  const { apiKey, saveKey } = useAPIKey()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showKeySetup, setShowKeySetup] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const systemPrompt = useMemo(
    () => buildDataContext(headers, rows, columns),
    [headers, rows, columns]
  )
  const suggested = useMemo(() => buildSuggestedQuestions(columns), [columns])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = useCallback(
    async (text?: string) => {
      const q = (text || input).trim()
      if (!q || loading) return

      if (!apiKey) { setShowKeySetup(true); return }

      const userMsg: Message = { role: 'user', content: q }
      const newMessages = [...messages, userMsg]
      setMessages(newMessages)
      setInput('')
      setLoading(true)

      try {
        const reply = await callClaude(newMessages, systemPrompt, apiKey)
        setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Something went wrong'
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: errMsg, error: true },
        ])
      } finally {
        setLoading(false)
        setTimeout(() => inputRef.current?.focus(), 100)
      }
    },
    [input, loading, apiKey, messages, systemPrompt]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleKeySet = (key: string) => {
    saveKey(key)
    setShowKeySetup(false)
    setTimeout(() => inputRef.current?.focus(), 200)
  }

  if (showKeySetup) {
    return (
      <APIKeySetup
        onKeySet={handleKeySet}
        onClose={() => setShowKeySetup(false)}
      />
    )
  }

  return (
    <div className="flex flex-col h-[620px] bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-indigo-600 to-violet-600">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-white" />
          <span className="font-bold text-white text-sm">Chat with your Data</span>
          <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
            Claude AI
          </span>
        </div>
        <div className="flex items-center gap-2">
          {apiKey && (
            <button
              onClick={() => setShowKeySetup(true)}
              className="flex items-center gap-1 text-white/70 hover:text-white text-xs transition-colors"
            >
              <Key className="w-3 h-3" /> Key
            </button>
          )}
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="flex items-center gap-1 text-white/70 hover:text-white text-xs transition-colors"
            >
              <Trash2 className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-5 py-4">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center mx-auto mb-3">
                <Bot className="w-7 h-7 text-indigo-600" />
              </div>
              <h3 className="font-bold text-slate-800 mb-1">Ask anything about your data</h3>
              <p className="text-slate-500 text-sm">
                {rows.length.toLocaleString()} rows · {columns.length} columns loaded
              </p>
            </div>
            <div className="w-full max-w-md space-y-2">
              <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <Lightbulb className="w-3 h-3" /> Suggested questions
              </p>
              {suggested.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="w-full text-left text-sm bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 px-4 py-2.5 rounded-xl transition-all"
                >
                  {q}
                </button>
              ))}
              {!apiKey && (
                <button
                  onClick={() => setShowKeySetup(true)}
                  className="w-full flex items-center justify-center gap-2 text-sm bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-100 px-4 py-2.5 rounded-xl transition-all mt-2"
                >
                  <Key className="w-4 h-4" /> Add Claude API Key to start
                </button>
              )}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} isLast={i === messages.length - 1} />
        ))}

        {loading && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
              <span className="text-slate-400 text-sm">Analyzing…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-100 bg-white">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={apiKey ? 'Ask a question… (Enter to send, Shift+Enter for newline)' : 'Add your API key to start chatting'}
            rows={1}
            disabled={loading}
            className="flex-1 resize-none border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-60 disabled:bg-slate-50 max-h-32"
            style={{ lineHeight: '1.5' }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 w-10 h-10 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
