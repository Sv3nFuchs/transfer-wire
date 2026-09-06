ALTER TABLE public.players
  ADD COLUMN birthplace text,
  ADD COLUMN birthplace_country_code text;

ALTER TABLE public.players
  ADD CONSTRAINT players_birthplace_country_code_check
  CHECK (birthplace_country_code IS NULL OR birthplace_country_code ~ '^[A-Z]{2}$');

ALTER TABLE public.clubs
  ADD COLUMN country_code text;

ALTER TABLE public.clubs
  ADD CONSTRAINT clubs_country_code_check
  CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$');

UPDATE public.clubs
SET country_code = CASE
  WHEN lower(country) IN ('sverige', 'sweden') THEN 'SE'
  WHEN lower(country) IN ('usa', 'united states', 'förenta staterna') THEN 'US'
  ELSE country_code
END
WHERE country_code IS NULL;