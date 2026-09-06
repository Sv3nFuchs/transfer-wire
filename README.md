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
