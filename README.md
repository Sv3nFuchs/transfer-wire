# Grassroots Football Hub

An open player and team database for grassroots football — clubs, teams,
players, and transfer/spell history — built with TanStack Start, Vite, and
Supabase.

## Development

You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone https://github.com/Sv3nFuchs/grassroot-player-hub
cd grassroot-player-hub
npm i
npm run dev
```

Copy `.env.example` to `.env` and fill in your own Supabase project's URL and
keys (see `supabase/migrations/*.sql` for the schema to apply to a fresh
project).

## Deployment

The build targets Cloudflare Workers (via Nitro's `cloudflare-module` preset,
configured in `vite.config.ts`). One-time setup:

```sh
npx wrangler login
```

Then, from the project root, build and set the two server-side secrets (the
`VITE_`-prefixed vars are inlined into the client bundle at build time and
don't need to be set here):

```sh
npm run build
npx wrangler secret put SUPABASE_URL --config .output/server/wrangler.json
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config .output/server/wrangler.json
```

`SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security — never commit it or
set it as a plain `var`, only as a `secret`. Once secrets are set, deploy with:

```sh
npx nitro deploy --prebuilt
```

Subsequent deploys just need `npm run build && npx nitro deploy --prebuilt` —
the secrets persist on the Worker across deploys.
