# Deployment Guide

This project is deployed in two parts:

1. Frontend to Firebase Hosting
2. Edge functions to Supabase

Project details used by this repo:

- Firebase Hosting project: `studio-3709772551-a6e58`
- Live site: `https://studio-3709772551-a6e58.web.app`
- Supabase project ref: `wifhzvembrhhbwaxzyga`

## Project Root

Run all commands from the repository root (the directory containing `package.json`).

## Frontend Deployment

Build locally:

```bash
npm run build
```

Deploy the built frontend to Firebase Hosting:

```bash
npm run deploy:hosting
```

Equivalent direct command:

```bash
firebase deploy --only hosting
```

## Supabase Function Deployment

Deploy `apply-filter`:

```bash
npm run deploy:function:apply-filter
```

Deploy `edit-image`:

```bash
npm run deploy:function:edit-image
```

Deploy both functions:

```bash
npm run deploy:functions
```

Equivalent direct commands:

```bash
supabase functions deploy apply-filter --no-verify-jwt --project-ref wifhzvembrhhbwaxzyga
supabase functions deploy edit-image --no-verify-jwt --project-ref wifhzvembrhhbwaxzyga
```

## Typical Release Flow

For a frontend-only change:

```bash
npm run build
npm run deploy:hosting
```

For an edge-function-only change:

```bash
npm run deploy:functions
```

For a full release:

```bash
npm run build
npm run deploy:functions
npm run deploy:hosting
```

## Required Services

Before deploying, make sure:

- You are logged into Firebase CLI:

```bash
firebase login
```

- You are logged into Supabase CLI:

```bash
supabase login
```

- The Supabase project is active and not paused.

## Required Environment and Secrets

Frontend `.env` values:

```bash
VITE_SUPABASE_URL="https://wifhzvembrhhbwaxzyga.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your_publishable_key"
```

Supabase function secrets:

- `GEMINI_API_KEY`
- `AI_MODEL` optional
- `AI_CLASSIFIER_MODEL` optional
- `RESEND_API_KEY` if using contact email

Example secret commands:

```bash
supabase secrets set GEMINI_API_KEY=YOUR_KEY --project-ref wifhzvembrhhbwaxzyga
supabase secrets set RESEND_API_KEY=YOUR_KEY --project-ref wifhzvembrhhbwaxzyga
```

## Quick Verification

After frontend deploy:

- Open `https://studio-3709772551-a6e58.web.app`
- Hard refresh the page
- Test login
- Test upload
- Test one animal image filter

After function deploy:

- Test `Watercolor`
- Test `Sketch`
- Test `Street Art`
- Test `Cubist`
- Test one edit prompt

## Rollback Reference

Current checkpoint commit already pushed to GitHub:

```bash
c013c29
```
