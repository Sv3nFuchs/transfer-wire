-- Bug: the recompute trigger looked up a rating's team_id by joining through
-- matches. When a match is deleted, ON DELETE CASCADE removes its ratings
-- first, and by the time this trigger fires on the cascaded ratings row, the
-- parent matches row is already gone within the same statement — so the
-- lookup returned NULL and the trigger silently skipped recomputation,
-- leaving player_season_stats stale (still counting the deleted match).
--
-- Fix: store team_id directly on match_player_ratings so the trigger never
-- needs the (possibly already-deleted) matches row.
ALTER TABLE public.match_player_ratings ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;

UPDATE public.match_player_ratings r
SET team_id = m.team_id
FROM public.matches m
WHERE m.id = r.match_id AND r.team_id IS NULL;

ALTER TABLE public.match_player_ratings ALTER COLUMN team_id SET NOT NULL;

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
  v_team_id := COALESCE(NEW.team_id, OLD.team_id);

  SELECT t.season, t.league INTO v_season, v_league FROM public.teams t WHERE t.id = v_team_id;

  SELECT
    count(*),
    coalesce(sum(r.goals_scored), 0),
    count(*) FILTER (WHERE r.rating IS NOT NULL),
    round(avg(r.rating), 1)
  INTO v_matches_played, v_goals, v_rated_matches, v_avg
  FROM public.match_player_ratings r
  WHERE r.player_id = v_player_id AND r.team_id = v_team_id;

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

-- One-time correction for rows left stale by the bug above (re-derive every
-- player_season_stats row from what's actually in match_player_ratings now).
DELETE FROM public.player_season_stats;
INSERT INTO public.player_season_stats (player_id, team_id, season, league, matches_played, goals, rated_matches, average_rating, updated_at)
SELECT
  r.player_id,
  r.team_id,
  t.season,
  t.league,
  count(*),
  coalesce(sum(r.goals_scored), 0),
  count(*) FILTER (WHERE r.rating IS NOT NULL),
  round(avg(r.rating), 1),
  now()
FROM public.match_player_ratings r
JOIN public.teams t ON t.id = r.team_id
GROUP BY r.player_id, r.team_id, t.season, t.league;
