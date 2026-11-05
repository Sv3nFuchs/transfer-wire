-- TransferWire is private while permission to use Everysport data is pending:
-- only signed-in users may read the app's data. Until now these nine tables
-- were readable by anyone on the internet through the public API key.
--
-- Each table: replace the "anyone can read" policy with a signed-in-only one,
-- and revoke the table-level SELECT grant from the anonymous role as well
-- (the same belt and braces used for profiles).
--
-- The scheduled Everysport sync is unaffected: it uses the service role,
-- which bypasses row-level security and is not the anon role.
--
-- To undo: supabase/rollbacks/20261105090000_make_data_private.rollback.sql

-- clubs
DROP POLICY IF EXISTS "clubs_public_read" ON public.clubs;
CREATE POLICY "clubs_authenticated_read" ON public.clubs FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.clubs FROM anon;

-- teams
DROP POLICY IF EXISTS "teams_public_read" ON public.teams;
CREATE POLICY "teams_authenticated_read" ON public.teams FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.teams FROM anon;

-- players
DROP POLICY IF EXISTS "players_public_read" ON public.players;
CREATE POLICY "players_authenticated_read" ON public.players FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.players FROM anon;

-- transfers
DROP POLICY IF EXISTS transfers_public_read ON public.transfers;
CREATE POLICY transfers_authenticated_read ON public.transfers FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.transfers FROM anon;

-- matches
DROP POLICY IF EXISTS matches_public_read ON public.matches;
CREATE POLICY matches_authenticated_read ON public.matches FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.matches FROM anon;

-- match_player_ratings
DROP POLICY IF EXISTS ratings_public_read ON public.match_player_ratings;
CREATE POLICY ratings_authenticated_read ON public.match_player_ratings FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.match_player_ratings FROM anon;

-- player_season_stats
DROP POLICY IF EXISTS player_season_stats_public_read ON public.player_season_stats;
CREATE POLICY player_season_stats_authenticated_read ON public.player_season_stats FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.player_season_stats FROM anon;

-- league_standings
DROP POLICY IF EXISTS league_standings_public_read ON public.league_standings;
CREATE POLICY league_standings_authenticated_read ON public.league_standings FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.league_standings FROM anon;

-- team_memberships
DROP POLICY IF EXISTS team_memberships_public_read ON public.team_memberships;
CREATE POLICY team_memberships_authenticated_read ON public.team_memberships FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.team_memberships FROM anon;

-- profiles was already locked down in 20261009100000_lock_down_profiles.sql.
