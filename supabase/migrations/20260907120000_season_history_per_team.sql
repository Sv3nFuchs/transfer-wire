-- player_season_stats was keyed only by (player_id, team_id), with `season`
-- copied from the team's CURRENT teams.season value at recompute time. Since
-- a team's season label is mutable (an admin edits it to "2027" when a new
-- season starts, on the same team row), a player's prior-season history at
-- that team would silently get relabeled/merged into the new season instead
-- of staying split by year.
--
-- Fix: lock each rating's season to its own match's date (which never
-- changes), store it directly on match_player_ratings, and make season part
-- of player_season_stats' grouping key — so a player's stats from a past
-- season at a team stay as their own row once the team moves on to a new one.
ALTER TABLE public.match_player_ratings ADD COLUMN IF NOT EXISTS season text;

UPDATE public.match_player_ratings r
SET season = to_char(m.match_date, 'YYYY')
FROM public.matches m
WHERE m.id = r.match_id AND r.season IS NULL;

ALTER TABLE public.match_player_ratings ALTER COLUMN season SET NOT NULL;

ALTER TABLE public.player_season_stats DROP CONSTRAINT player_season_stats_player_id_team_id_key;
ALTER TABLE public.player_season_stats ADD CONSTRAINT player_season_stats_player_id_team_id_season_key UNIQUE (player_id, team_id, season);

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
  v_season := COALESCE(NEW.season, OLD.season);

  -- League still reflects the team's current division (used to match the
  -- Statistics tab's league filter, which is also sourced from teams.league).
  SELECT t.league INTO v_league FROM public.teams t WHERE t.id = v_team_id;

  SELECT
    count(*),
    coalesce(sum(r.goals_scored), 0),
    count(*) FILTER (WHERE r.rating IS NOT NULL),
    round(avg(r.rating), 1)
  INTO v_matches_played, v_goals, v_rated_matches, v_avg
  FROM public.match_player_ratings r
  WHERE r.player_id = v_player_id AND r.team_id = v_team_id AND r.season = v_season;

  IF v_matches_played = 0 THEN
    DELETE FROM public.player_season_stats WHERE player_id = v_player_id AND team_id = v_team_id AND season = v_season;
  ELSE
    INSERT INTO public.player_season_stats (player_id, team_id, season, league, matches_played, goals, rated_matches, average_rating, updated_at)
    VALUES (v_player_id, v_team_id, v_season, v_league, v_matches_played, v_goals, v_rated_matches, v_avg, now())
    ON CONFLICT (player_id, team_id, season) DO UPDATE SET
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

-- One-time re-derivation of every player_season_stats row under the new,
-- season-aware grouping.
DELETE FROM public.player_season_stats;
INSERT INTO public.player_season_stats (player_id, team_id, season, league, matches_played, goals, rated_matches, average_rating, updated_at)
SELECT
  r.player_id,
  r.team_id,
  r.season,
  t.league,
  count(*),
  coalesce(sum(r.goals_scored), 0),
  count(*) FILTER (WHERE r.rating IS NOT NULL),
  round(avg(r.rating), 1),
  now()
FROM public.match_player_ratings r
JOIN public.teams t ON t.id = r.team_id
GROUP BY r.player_id, r.team_id, r.season, t.league;
