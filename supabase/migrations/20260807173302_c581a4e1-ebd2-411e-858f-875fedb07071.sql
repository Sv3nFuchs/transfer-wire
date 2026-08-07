ALTER TABLE public.clubs ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.teams ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.players ALTER COLUMN created_by DROP NOT NULL;