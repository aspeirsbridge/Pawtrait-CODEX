# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Pawtrait ("Pawtrait Pet Palace") is a mobile-first React SPA that turns pet photos into AI-generated art. A user uploads a pet photo, picks an art style (filter), optionally refines it with a natural-language edit prompt, then saves the result to their personal gallery. All AI image work runs in Supabase Edge Functions that call the Google Gemini image API. The frontend is a standalone Vite app (no Lovable subscription needed); the built site is served from Firebase Hosting.

## Commands

Package manager: `npm` (a `bun.lockb` also exists, but scripts and CI use npm).

- `npm run dev` — Vite dev server on **port 8080** (not 5173).
- `npm run build` — production build to `dist/`.
- `npm run build:dev` — build with development mode/env.
- `npm run lint` — ESLint over the repo.
- `npm run preview` — serve the production build locally.

There is **no test runner and no typecheck script** configured. To check types, run `npx tsc --noEmit`.

Deploy (see `DEPLOYMENT.md` for the full flow; requires `firebase login` and `supabase login`):

- `npm run deploy:hosting` — build output to Firebase Hosting (project `studio-3709772551-a6e58`).
- `npm run deploy:functions` — deploy both edge functions to Supabase (project ref `wifhzvembrhhbwaxzyga`).
- `npm run deploy:function:apply-filter` / `:edit-image` — deploy a single function.

## Environment

Frontend `.env` (validated at startup by `src/lib/env.ts` — malformed/placeholder values throw and the app renders a config error instead of booting):

- `VITE_SUPABASE_URL` — must be `https://<ref>.supabase.co`.
- `VITE_SUPABASE_PUBLISHABLE_KEY` — anon JWT (`eyJ…`) or `sb_publishable_…` key.
- `VITE_BASE_PATH` — optional, for subpath hosting (e.g. `/pawtrait/`); only applied in production builds and wired into the router basename (see below).

Edge-function secrets (set via `supabase secrets set`, not in `.env`): `GEMINI_API_KEY` (required), optional `AI_MODEL` (default `gemini-2.5-flash-image`), `AI_CLASSIFIER_MODEL` (default `gemini-2.5-flash`), and `RESEND_API_KEY` for the contact-email function.

## Architecture

### Frontend flow (state passed through the router, not persisted)

The core pipeline moves an image between pages via **React Router `location.state`** — there is no global store. Understanding this is key to the app:

1. **Home** (`src/pages/Home.tsx`) — upload. The file is downscaled/re-encoded client-side by `optimizeUploadedImage` (`src/lib/image.ts`, max 2048px, JPEG q0.86, PNG kept as PNG) into a **data URL**, then `navigate("/filters", { state: { imageUrl, fileName } })`.
2. **Filters** (`src/pages/Filters.tsx`) — crop/rotate (`react-easy-crop`) and pick a style, then invoke the `apply-filter` edge function. Result (a new data URL) is passed on to `/edit`.
3. **Edit** (`src/pages/Edit.tsx`) — optional natural-language edit via the `edit-image` function; maintains a local `imageHistory` for undo. **Saving** uploads the image bytes to the `pawtraits` storage bucket and inserts a row in the `pawtraits` table (stores both the styled `image_url` and the pre-filter `original_image_url` for gallery compare).
4. **Gallery** (`src/pages/Gallery.tsx`) — lists the signed-in user's saved pawtraits, supports delete (removes storage object + row) and a before/after compare view.

Because images ride in `location.state`, deep-linking directly to `/filters` or `/edit` has no image and redirects home. Auth is required to reach Edit/Gallery.

### API and error handling

- **All network calls go through `runApi()` in `src/lib/api.ts`** — a wrapper adding timeout (default 25s), retry-with-backoff for retryable errors, and normalization of unknown errors into a typed `ApiClientError` (`ApiErrorCode`). Use `getUserFriendlyErrorMessage(error)` to surface messages to users. When adding any Supabase/network call, wrap it in `runApi` with an `operation` label rather than calling Supabase directly.
- Auth is a thin hook, `src/hooks/useAuth.tsx` (Supabase `onAuthStateChange` + `getSession`); there is no auth context/provider — each page calls `useAuth()` and redirects to `/auth` when unauthenticated.
- Supabase client: `src/integrations/supabase/client.ts` (reads validated env; header comment says "auto-generated / do not edit"). Generated DB types live in `src/integrations/supabase/types.ts`.

### Edge functions (`supabase/functions/*/index.ts`, Deno)

- **`apply-filter`** — the substantive one. It (1) normalizes the input image (data URL or fetched URL, ≤10MB), (2) **classifies** the image with the classifier model to detect whether it contains an animal, and **rejects non-animal images with a 422** (`NON_ANIMAL_IMAGE_MESSAGE`), (3) builds a species-aware guard prompt so the AI preserves the animal's identity, then (4) calls Gemini for the styled image. Allowed `filterId`s are hardcoded: `original` (short-circuits, returns input unchanged), `watercolor`, `sketch`, `banksy` (labeled "Street Art" in UI), `picasso` (labeled "Cubist"). **The detailed style prompts live inline in this function** — edit them there, and keep the `allowedFilters` list, the `stylePrompts` map, and the UI's `filterStyles` in `Filters.tsx` in sync.
- **`edit-image`** — applies a free-text edit (≤500 chars) to an already-styled image, with a guard prompt to keep the pet recognizable.
- **`send-contact-email`** — used by Settings; needs `RESEND_API_KEY`.
- Functions are deployed with `--no-verify-jwt`; they read raw JSON bodies and handle their own CORS.

### Data model

Single table `public.pawtraits` (`user_id`, `image_url`, `original_image_url`, `filter_name`, `description`, `created_at`) protected by RLS scoped to `auth.uid()`. Images live in the public-read `pawtraits` storage bucket. Migrations are in `supabase/migrations/`.

### UI conventions

- **shadcn/ui** components in `src/components/ui/` (Radix + `class-variance-authority`); configured via `components.json`. Compose these rather than hand-rolling primitives. Tailwind theme/tokens in `tailwind.config.ts` and `src/index.css`.
- Path alias `@/` → `src/` (configured in both `vite.config.ts` and `tsconfig`).
- Toasts: this repo uses **`sonner`** (`import { toast } from "sonner"`) in pages; a legacy shadcn toaster also exists but new code should use sonner.
- Routing: routes are declared in `src/App.tsx`; the catch-all `*` → `NotFound` must stay last. The router `basename` is derived from `import.meta.env.BASE_URL` to support subpath hosting.
- Bottom navigation (`BottomNav`) is rendered globally outside `<Routes>`.

## Gotchas

- TypeScript is configured loosely (`tsconfig` relaxes strict/`noUnusedLocals`/`noImplicitAny`); don't rely on the compiler to catch much.
- Several page files (`Filters.tsx`, `Edit.tsx`) begin with a UTF-8 BOM — preserve it when editing to avoid spurious diffs.
- Images are handled as base64 data URLs end-to-end (client → function → back), which is why the 10MB input cap and client-side downscaling matter.
