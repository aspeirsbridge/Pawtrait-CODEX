# Pawtrait Pet Palace

Standalone local React + Vite app. No Lovable subscription is required.

## Prerequisites

- Node.js 20+ and npm
- Supabase project (for backend and storage)

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
