-- US state a player was born in (postal code, e.g. "CA"), shown as a state
-- flag instead of the generic USA flag when birthplace_country_code = 'US'.
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS birthplace_state text;
