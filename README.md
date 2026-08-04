# Tactical Operations Center (MyTOC)

Operations command center for COOs and C-Suite leaders. Built with Vite, React, TypeScript, and Supabase.

**Site:** [MyTOC.com](https://MyTOC.com)

## Setup

1. Copy `.env.local` and fill in your Supabase credentials.
2. Install dependencies: `pnpm install`
3. Start the dev server: `pnpm dev`

## Routes

- `/login` — Sign in
- `/signup` — Create account
- `/dashboard` — owned checklists with real-time sync
- `/checklist/:id` — objectives, messages, settings, sharing
- `/profile` — account settings

## Database

Schema migrations remain under the legacy `chkchk_*` table/RPC names (shared Supabase project):

- `supabase/migrations/20260713192100_create_chkchk_schema.sql`
- `supabase/migrations/20260713200000_chkchk_invite_helpers.sql`

Apply new migrations via Supabase dashboard SQL or MCP.

## Artwork

Place brand assets in `public/`:

- `icon-192.png`, `icon-512.png` — PWA / favicon
- Optional hero/banner images as you replace placeholders in the UI

## Vercel deployment

```bash
pnpm run build
pnpm dlx vercel login
pnpm dlx vercel --prod
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel.

## Scripts

- `pnpm dev` — Start development server
- `pnpm build` — Production build
- `pnpm preview` — Preview production build
- `pnpm lint` — Run ESLint

## Account deletion

Calls the `delete-account-chkchk` Edge Function (backend name unchanged):

```bash
supabase functions deploy delete-account-chkchk --project-ref psbdjnqcjpxapypcfigx
```
