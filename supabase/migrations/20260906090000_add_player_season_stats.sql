-- Precomputed per-player, per-team season totals (matches played, goals,
-- average rating). One row per player+team; season/league are denormalized
-- from the team for easy filtering. Kept in sync by a trigger on
-- match_player_ratings, so reads never need to scan raw match/rating rows.
CREATE TABLE public.player_season_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  season text,
  league text,
  matches_played int NOT NULL DEFAULT 0,
  goals int NOT NULL DEFAULT 0,
  rated_matches int NOT NULL DEFAULT 0,
  average_rating numeric(3,1),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, team_id)
);

-- Read-only to clients: only the trigger function (SECURITY DEFINER) writes
-- to this table, so no INSERT/UPDATE/DELETE policies are granted at all.
GRANT SELECT ON public.player_season_stats TO anon;
GRANT SELECT ON public.player_season_stats TO authenticated;
GRANT ALL ON public.player_season_stats TO service_role;
ALTER TABLE public.player_season_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY player_season_stats_public_read ON public.player_season_stats FOR SELECT USING (true);

CREATE INDEX player_season_stats_league_idx ON public.player_season_stats(league);
CREATE INDEX player_season_stats_player_idx ON public.player_season_stats(player_id);

CREATE OR REPLACE FUNCTION public.recompute_player_season_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player_id uuid;
  v_team_id uuid;
  v_season text;
  v_league text;
  v_matches_played int;
  v_goals int;
  v_rated_matches int;
  v_avg numeric(3,1);
BEGIN
  v_player_id := COALESCE(NEW.player_id, OLD.player_id);

  SELECT m.team_id INTO v_team_id
  FROM public.matches m
  WHERE m.id = COALESCE(NEW.match_id, OLD.match_id);

  IF v_team_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT t.season, t.league INTO v_season, v_league FROM public.teams t WHERE t.id = v_team_id;

  SELECT
    count(*),
    coalesce(sum(r.goals_scored), 0),
    count(*) FILTER (WHERE r.rating IS NOT NULL),
    round(avg(r.rating), 1)
  INTO v_matches_played, v_goals, v_rated_matches, v_avg
  FROM public.match_player_ratings r
  JOIN public.matches m ON m.id = r.match_id
  WHERE r.player_id = v_player_id AND m.team_id = v_team_id;

  IF v_matches_played = 0 THEN
    DELETE FROM public.player_season_stats WHERE player_id = v_player_id AND team_id = v_team_id;
  ELSE
    INSERT INTO public.player_season_stats (player_id, team_id, season, league, matches_played, goals, rated_matches, average_rating, updated_at)
    VALUES (v_player_id, v_team_id, v_season, v_league, v_matches_played, v_goals, v_rated_matches, v_avg, now())
    ON CONFLICT (player_id, team_id) DO UPDATE SET
      season = excluded.season,
      league = excluded.league,
      matches_played = excluded.matches_played,
      goals = excluded.goals,
      rated_matches = excluded.rated_matches,
      average_rating = excluded.average_rating,
      updated_at = now();
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_recompute_player_season_stats
AFTER INSERT OR UPDATE OR DELETE ON public.match_player_ratings
FOR EACH ROW EXECUTE FUNCTION public.recompute_player_season_stats();
