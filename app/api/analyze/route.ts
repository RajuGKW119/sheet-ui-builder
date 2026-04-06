import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'
export const maxDuration = 30

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(request: NextRequest) {
  let body: {
    messages?: Message[]
    systemPrompt?: string
    apiKey?: string
    mode?: 'chat' | 'insights'
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { messages, systemPrompt, apiKey, mode = 'chat' } = body

  if (!apiKey || typeof apiKey !== 'string' || !apiKey.startsWith('sk-ant-')) {
    return NextResponse.json(
      { error: 'Invalid Claude API key. It should start with sk-ant-' },
      { status: 401 }
    )
  }

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: 'No messages provided' }, { status: 400 })
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: mode === 'insights' ? 800 : 1024,
        system: systemPrompt || '',
        messages,
      }),
    })

    if (!response.ok) {
      let errMsg = `Claude API error (${response.status})`
      try {
        const errData = await response.json() as { error?: { message?: string } }
        errMsg = errData?.error?.message || errMsg
      } catch {
        // ignore parse error
      }
      if (response.status === 401) errMsg = 'Invalid API key. Check your Claude API key.'
      if (response.status === 429) errMsg = 'Rate limit reached. Please wait a moment and try again.'
      if (response.status === 400) errMsg = 'Request too large. Try with a smaller dataset.'
      return NextResponse.json({ error: errMsg }, { status: response.status })
    }

    const data = await response.json() as {
      content: Array<{ type: string; text: string }>
    }

    const text = data.content?.[0]?.text || ''
    return NextResponse.json({ content: text })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to reach Claude API: ${msg}` }, { status: 502 })
  }
}
