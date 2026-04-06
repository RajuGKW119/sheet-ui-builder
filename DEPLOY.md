# Deploy Sheet UI Builder to Vercel

## One-Click Deploy (Recommended)

1. Push this folder to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → **New Project**
3. Import your GitHub repo
4. Click **Deploy** — done! ✨

Vercel will auto-detect Next.js and use the settings in `vercel.json`.

---

## CLI Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# From this folder:
vercel

# For production:
vercel --prod
```

---

## Local Development

```bash
npm install
npm run dev
# Open http://localhost:3000
```

---

## How It Works

| Feature | How |
|---|---|
| Google Sheets | Public sheets fetched via `/api/sheets` proxy (avoids CORS) |
| CSV | Parsed client-side with PapaParse |
| Excel | Parsed client-side with SheetJS |
| Charts | Auto-generated with Recharts based on column types |
| Table | Sortable, filterable, paginated — all in React |

## Google Sheets Setup

For the Google Sheets integration to work, the sheet **must** be shared publicly:
1. Click **Share** in Google Sheets
2. Change to **"Anyone with the link"**
3. Set permission to **Viewer**
4. Copy the link and paste it into Sheet UI Builder
