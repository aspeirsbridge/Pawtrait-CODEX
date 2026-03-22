# Pawtrait Pet Palace

Standalone local React + Vite app. No Lovable subscription is required.

## Prerequisites

- Node.js 20+ and npm
- Supabase project (for backend and storage)

## Frontend env setup (required)

Create a `.env` file in the project root with:

```bash
VITE_SUPABASE_URL="https://<your-project-ref>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<your-anon-jwt-or-sb_publishable_key>"
# Optional for subpath hosting (example: /pawtrait/)
VITE_BASE_PATH="/"
```

Notes:
- A ready template exists at `.env.example`.
- The app now validates these values at startup and will show a config error page if they are missing or malformed.

## Local run

1. Install dependencies:
   `npm install`
2. Start dev server:
   `npm run dev`
3. Open the local URL shown in terminal.

## Backend env (Supabase Edge Functions)

Set these secrets in your Supabase project:

- `GEMINI_API_KEY`: your Gemini API key
- `AI_API_BASE_URL` (optional): defaults to `https://generativelanguage.googleapis.com/v1beta/openai`
- `AI_MODEL` (optional): defaults to `gemini-2.5-flash-image-preview`

Deploy functions after setting secrets:

`supabase functions deploy apply-filter`
`supabase functions deploy edit-image`

## Build for testing

- `npm run build`
- `npm run preview`

## Deployment

A dedicated deployment guide is included here:

- [DEPLOYMENT.md](C:\Users\andre\OneDrive\Documents\CODEX\pawtrait-pet-palace-main\pawtrait-pet-palace-main\DEPLOYMENT.md)

Helpful deployment commands:

- `npm run deploy:hosting`
- `npm run deploy:function:apply-filter`
- `npm run deploy:function:edit-image`
- `npm run deploy:functions`
