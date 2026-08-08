# MyTOC — Tactical Operations Center

Operations command center for COOs and C-Suite leaders. Built with Vite, React, TypeScript, and Supabase.

**Site:** [mytoc.app](https://mytoc.app) (Vercel: mytoc-eta.vercel.app)

## Setup

1. Copy `.env.local` and fill in your Supabase credentials.
2. Install dependencies: `pnpm install`
3. Start the dev server: `pnpm dev`

## Routes

- `/login` — Sign in
- `/signup` — Create Lead account
- `/team-signup` — Team Member invite signup
- `/dashboard` — Lead command view
- `/my-cards` — Team Member directives
- `/checklist/:id` — items, messages, files, assign
- `/settings` — How to use, Team, Upgrade
- `/profile` — account & notifications

## Database

Schema migrations remain under the legacy `chkchk_*` table/RPC names (shared Supabase project).

Apply new migrations via Supabase dashboard SQL or MCP.

## Vercel deployment

```bash
pnpm run build
pnpm dlx vercel --prod
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel. Point **mytoc.app** at the Vercel project and update Supabase Auth Site URL / redirect allow-list.
