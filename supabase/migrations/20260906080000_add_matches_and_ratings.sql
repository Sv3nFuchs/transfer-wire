CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  opponent_club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL,
  opponent_name text NOT NULL,
  match_date date NOT NULL,
  home_away text NOT NULL DEFAULT 'home' CHECK (home_away IN ('home', 'away', 'neutral')),
  team_score int,
  opponent_score int,
  competition text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.matches TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matches TO authenticated;
GRANT ALL ON public.matches TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY matches_public_read ON public.matches FOR SELECT USING (true);
CREATE POLICY matches_insert_auth ON public.matches FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY matches_update_own ON public.matches FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE POLICY matches_delete_own ON public.matches FOR DELETE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY matches_admin_update ON public.matches FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY matches_admin_delete ON public.matches FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX matches_team_idx ON public.matches(team_id);
CREATE INDEX matches_date_idx ON public.matches(match_date DESC);

CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- One row per player who featured in a match: performance rating (admin-only,
-- FotMob-style 1.0-10.0) plus goals scored, used for league statistics.
CREATE TABLE public.match_player_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  rating numeric(3,1) CHECK (rating IS NULL OR (rating >= 1.0 AND rating <= 10.0)),
  goals_scored int NOT NULL DEFAULT 0 CHECK (goals_scored >= 0),
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, player_id)
);

GRANT SELECT ON public.match_player_ratings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_player_ratings TO authenticated;
GRANT ALL ON public.match_player_ratings TO service_role;
ALTER TABLE public.match_player_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY ratings_public_read ON public.match_player_ratings FOR SELECT USING (true);
-- Ratings are admin-only to enter/change, unlike the rest of the app's "anyone can
-- add, owner or admin can edit" pattern — performance ratings should be curated.
CREATE POLICY ratings_admin_insert ON public.match_player_ratings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY ratings_admin_update ON public.match_player_ratings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY ratings_admin_delete ON public.match_player_ratings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX ratings_match_idx ON public.match_player_ratings(match_id);
CREATE INDEX ratings_player_idx ON public.match_player_ratings(player_id);

CREATE TRIGGER update_match_player_ratings_updated_at
  BEFORE UPDATE ON public.match_player_ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
