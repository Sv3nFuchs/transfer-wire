# TransferWire:

An open player and team database for football: clubs, teams, players, and transfer/spell history. Built with TanStack Start, Vite, and Supabase, and deployed on Cloudflare Workers.

## Features:

- Clubs, teams, and player profiles, including player photos and a player "passport" view.
- Transfer and spell history for each player.
- Match pages and standings tables with league position.
- Fixtures and results synced automatically.
- Admin tools, including importing clubs.
- User accounts with Supabase Auth and Row Level Security.

## Tech stack:

TypeScript, TanStack Start, Supabase (PostgreSQL), Cloudflare Workers.

## How it works:

- The front end is a React app using TanStack Start's file-based routing (`src/routes`).
- Supabase provides the database, authentication, and Row Level Security. The schema lives in `supabase/migrations`.
- A scheduled task (`tasks/fixtures`) pulls fixtures and results.
- The app is built with Nitro's Cloudflare Workers preset and deployed as a Worker.

## About this project:

TransferWire started on Lovable and was migrated to a self-managed GitHub, Supabase, and Cloudflare setup. It was built with AI assistance (Claude Code). I directed the work, set up the database and deployment, and handled the migration.

## Development:

You need Node.js and npm. Install them with nvm.

```
git clone https://github.com/Sv3nFuchs/transfer-wire
cd transfer-wire
npm i
npm run dev
```

Copy `.env.example` to `.env` and fill in your own Supabase project's URL and keys. See `supabase/migrations/*.sql` for the schema to apply to a fresh project.

## Deployment:

The build targets Cloudflare Workers (via Nitro's `cloudflare-module` preset, configured in `vite.config.ts`). One-time setup:

```
npx wrangler login
```

If this is a brand-new Cloudflare account with no Worker deployed yet, it also needs a one-time workers.dev subdomain. Register it at https://dash.cloudflare.com/workers/onboarding before deploying, or the first deploy will fail.

Build and set the three server-side secrets. The `VITE_`-prefixed variables are inlined into the client bundle at build time and don't need to be set here. `SUPABASE_PUBLISHABLE_KEY` (without the prefix) is still read server-side and must be set, or pages will return a 500 error.

```
npm run build
npx wrangler secret put SUPABASE_URL --config .output/server/wrangler.json
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY --config .output/server/wrangler.json
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config .output/server/wrangler.json
```

`SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security. Never commit it or set it as a plain variable; only set it as a secret. Then deploy:

```
npx nitro deploy --prebuilt
```

Later deploys only need `npm run build && npx nitro deploy --prebuilt`. The secrets stay on the Worker.

## Notes:

- The first user to sign up becomes admin. Change this for your own deployment.
- Licensed under MIT.
