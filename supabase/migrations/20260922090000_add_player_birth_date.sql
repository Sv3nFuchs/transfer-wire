-- Full birthday, optional and separate from birth_year (which many players
-- will still only know the year for). Lets the app compute exact age at a
-- given match date (e.g. age at debut) when it's filled in.
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS birth_date date;
