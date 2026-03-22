# Deployment Guide

This project is deployed in two parts:

1. Frontend to Firebase Hosting
2. Edge functions to Supabase

Project details used by this repo:

- Firebase Hosting project: `studio-3709772551-a6e58`
- Live site: `https://studio-3709772551-a6e58.web.app`
- Supabase project ref: `wifhzvembrhhbwaxzyga`

## Project Root

Run all commands from:

```powershell
C:\Users\andre\OneDrive\Documents\CODEX\pawtrait-pet-palace-main\pawtrait-pet-palace-main
```

## Frontend Deployment

Build locally:

```powershell
npm run build
```

Deploy the built frontend to Firebase Hosting:

```powershell
npm run deploy:hosting
```

Equivalent direct command:

```powershell
firebase deploy --only hosting
```

## Supabase Function Deployment

Deploy `apply-filter`:

```powershell
npm run deploy:function:apply-filter
```

Deploy `edit-image`:

```powershell
npm run deploy:function:edit-image
```

Deploy both functions:

```powershell
npm run deploy:functions
```

Equivalent direct commands:

```powershell
supabase functions deploy apply-filter --no-verify-jwt --project-ref wifhzvembrhhbwaxzyga
supabase functions deploy edit-image --no-verify-jwt --project-ref wifhzvembrhhbwaxzyga
```

## Typical Release Flow

For a frontend-only change:

```powershell
npm run build
npm run deploy:hosting
```

For an edge-function-only change:

```powershell
npm run deploy:functions
```

For a full release:

```powershell
npm run build
npm run deploy:functions
npm run deploy:hosting
```

## Required Services

Before deploying, make sure:

- You are logged into Firebase CLI:

```powershell
firebase login
```

- You are logged into Supabase CLI:

```powershell
supabase login
```

- The Supabase project is active and not paused.

## Required Environment and Secrets

Frontend `.env` values:

```powershell
VITE_SUPABASE_URL="https://wifhzvembrhhbwaxzyga.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your_publishable_key"
```

Supabase function secrets:

- `GEMINI_API_KEY`
- `AI_MODEL` optional
- `AI_CLASSIFIER_MODEL` optional
- `RESEND_API_KEY` if using contact email

Example secret commands:

```powershell
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

```powershell
c013c29
```
