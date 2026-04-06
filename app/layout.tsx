import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sheet UI Builder — Turn any data into a beautiful dashboard',
  description:
    'Paste a Google Sheet link or upload a CSV / Excel file and instantly get a sortable, searchable table with auto-generated charts — no code needed.',
  keywords: ['google sheets', 'csv viewer', 'excel dashboard', 'data visualization', 'no-code'],
  openGraph: {
    title: 'Sheet UI Builder',
    description: 'Turn any spreadsheet into a beautiful interactive dashboard in seconds.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
