-- Undo 20261105090000_make_data_private.sql: make the nine tables readable by
-- anyone again. NOT a migration (lives outside supabase/migrations on purpose);
-- run it by hand in the SQL editor only if you want the data public again.

DROP POLICY IF EXISTS "clubs_authenticated_read" ON public.clubs;
CREATE POLICY "clubs_public_read" ON public.clubs FOR SELECT USING (true);
GRANT SELECT ON public.clubs TO anon;

DROP POLICY IF EXISTS "teams_authenticated_read" ON public.teams;
CREATE POLICY "teams_public_read" ON public.teams FOR SELECT USING (true);
GRANT SELECT ON public.teams TO anon;

DROP POLICY IF EXISTS "players_authenticated_read" ON public.players;
CREATE POLICY "players_public_read" ON public.players FOR SELECT USING (true);
GRANT SELECT ON public.players TO anon;

DROP POLICY IF EXISTS transfers_authenticated_read ON public.transfers;
CREATE POLICY transfers_public_read ON public.transfers FOR SELECT USING (true);
GRANT SELECT ON public.transfers TO anon;

DROP POLICY IF EXISTS matches_authenticated_read ON public.matches;
CREATE POLICY matches_public_read ON public.matches FOR SELECT USING (true);
GRANT SELECT ON public.matches TO anon;

DROP POLICY IF EXISTS ratings_authenticated_read ON public.match_player_ratings;
CREATE POLICY ratings_public_read ON public.match_player_ratings FOR SELECT USING (true);
GRANT SELECT ON public.match_player_ratings TO anon;

DROP POLICY IF EXISTS player_season_stats_authenticated_read ON public.player_season_stats;
CREATE POLICY player_season_stats_public_read ON public.player_season_stats FOR SELECT USING (true);
GRANT SELECT ON public.player_season_stats TO anon;

DROP POLICY IF EXISTS league_standings_authenticated_read ON public.league_standings;
CREATE POLICY league_standings_public_read ON public.league_standings FOR SELECT USING (true);
GRANT SELECT ON public.league_standings TO anon;

DROP POLICY IF EXISTS team_memberships_authenticated_read ON public.team_memberships;
CREATE POLICY team_memberships_public_read ON public.team_memberships FOR SELECT USING (true);
GRANT SELECT ON public.team_memberships TO anon;
