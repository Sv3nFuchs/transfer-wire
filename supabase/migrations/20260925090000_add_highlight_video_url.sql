-- Link to a player's highlight reel (YouTube, Hudl, etc.), shown as a
-- "Watch highlights" button on their profile and included on their Player
-- Passport — supports the recruiting use case these grassroots players
-- actually have, which Transfermarkt/FotMob/etc. don't need to serve.
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS highlight_video_url text;
