ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS flag_1 text,
  ADD COLUMN IF NOT EXISTS flag_2 text;

ALTER TABLE public.players
  ADD CONSTRAINT players_flag_1_format CHECK (flag_1 IS NULL OR flag_1 ~ '^[A-Z]{2}$'),
  ADD CONSTRAINT players_flag_2_format CHECK (flag_2 IS NULL OR flag_2 ~ '^[A-Z]{2}$');