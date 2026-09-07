-- Everysport fixture import: a team can be linked to its Everysport team page,
-- and clubs/matches remember the Everysport ids that produced them so re-syncing
-- is idempotent and future opponents can be auto-linked by id instead of name.
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS everysport_url text;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS everysport_id text;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS external_source text;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS external_id text;

-- A plain UNIQUE constraint already permits unlimited (null, null) rows under
-- standard SQL semantics, so manually-logged matches never collide with each
-- other — and unlike a partial index, this works directly as an ON CONFLICT
-- target for the importer's upsert.
ALTER TABLE public.matches ADD CONSTRAINT matches_external_source_id_key UNIQUE (external_source, external_id);

CREATE INDEX IF NOT EXISTS clubs_everysport_id_idx ON public.clubs (everysport_id) WHERE everysport_id IS NOT NULL;
