import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const gid = searchParams.get('gid') || '0'

  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    return NextResponse.json({ error: 'Invalid sheet ID' }, { status: 400 })
  }

  // Try gid-specific export first, then fallback to first sheet
  const urls = [
    `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`,
    `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`,
  ]

  for (const exportUrl of urls) {
    try {
      const response = await fetch(exportUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; SheetUIBuilder/1.0; +https://sheet-ui-builder.vercel.app)',
          Accept: 'text/csv,text/plain,*/*',
        },
        redirect: 'follow',
      })

      if (response.ok) {
        const csvText = await response.text()
        return new NextResponse(csvText, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
            'Access-Control-Allow-Origin': '*',
          },
        })
      }

      if (response.status === 403 || response.status === 401) {
        return NextResponse.json(
          {
            error:
              'Access denied. Make sure your Google Sheet is set to "Anyone with the link can view".',
          },
          { status: 403 }
        )
      }
    } catch {
      // try next URL
    }
  }

  return NextResponse.json(
    { error: 'Could not fetch the Google Sheet. Please check the URL and sharing settings.' },
    { status: 502 }
  )
}
