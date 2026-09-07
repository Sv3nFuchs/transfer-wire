-- Many opponents in imported fixtures don't have a registered club row here
-- (matches_opponent_club_id_fkey is null), so their crest can't come from
-- clubs.logo_url. Capture the opponent's logo straight from the import
-- source (Everysport) at sync time instead.
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS opponent_logo_url text;
