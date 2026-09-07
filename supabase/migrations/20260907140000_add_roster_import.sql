-- A team can be linked to an external roster page (e.g. a CIF-SS/ScoreBookLive
-- team roster URL) so admins can bulk-link existing players to that team's
-- past-season roster via team_memberships, without needing match data.
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS roster_url text;
