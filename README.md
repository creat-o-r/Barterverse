# BarterVerse

A Next.js 15 barter/trading platform with AI-powered matching using Google's Genkit framework.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Gemini API key:
```env
GEMINI_API_KEY=your_actual_api_key_here
```

Get your API key from: https://aistudio.google.com/app/apikey

### 3. Run Development Server
```bash
npm run dev
```

Visit http://localhost:9002

## Deployment

### Vercel (Recommended)

1. **Set Environment Variables:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `GEMINI_API_KEY` with your Gemini API key
   - Add: `GOOGLE_API_KEY` with the same Gemini API key (fallback)

2. **Deploy:**
   ```bash
   git push origin main
   ```
   Vercel auto-deploys on push.

### Important Notes for Production

- **Read-Only Filesystem**: Vercel and other serverless platforms have read-only filesystems
- **Logging**: File-based logging is dev-only. In production, logs appear in Vercel logs console
- **Environment**: Set `NODE_ENV=production` (automatic on Vercel)

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **AI**: Google Genkit 1.8.0, Gemini 1.5 Pro
- **UI**: shadcn/ui components
- **Data**: Dummy data (database migration planned)
- **Deployment**: Vercel

## Documentation

See `CLAUDE.md` for architecture details and development commands.
