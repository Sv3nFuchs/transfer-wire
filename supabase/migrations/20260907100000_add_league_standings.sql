-- The official, full league table imported from Everysport (all teams in the
-- division, not just ones registered in this app). Keyed by our own `league`
-- string (the same value used on teams.league) so it joins with the existing
-- league selector, and by the Everysport team id so re-syncing replaces rows
-- in place instead of duplicating them.
CREATE TABLE public.league_standings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league text NOT NULL,
  position int NOT NULL,
  team_name text NOT NULL,
  team_logo_url text,
  everysport_team_id text NOT NULL,
  played int NOT NULL DEFAULT 0,
  won int NOT NULL DEFAULT 0,
  drawn int NOT NULL DEFAULT 0,
  lost int NOT NULL DEFAULT 0,
  goals_for int NOT NULL DEFAULT 0,
  goals_against int NOT NULL DEFAULT 0,
  points int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (league, everysport_team_id)
);

GRANT SELECT ON public.league_standings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_standings TO authenticated;
GRANT ALL ON public.league_standings TO service_role;
ALTER TABLE public.league_standings ENABLE ROW LEVEL SECURITY;

CREATE POLICY league_standings_public_read ON public.league_standings FOR SELECT USING (true);
-- Written only by the Everysport sync action, which already re-checks admin
-- server-side — mirrors match_player_ratings' admin-only write policy.
CREATE POLICY league_standings_admin_insert ON public.league_standings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY league_standings_admin_update ON public.league_standings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY league_standings_admin_delete ON public.league_standings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX league_standings_league_idx ON public.league_standings (league);
