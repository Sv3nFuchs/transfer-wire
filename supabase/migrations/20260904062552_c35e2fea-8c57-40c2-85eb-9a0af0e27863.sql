ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS org_type text NOT NULL DEFAULT 'club';

ALTER TABLE public.clubs
  ADD CONSTRAINT clubs_org_type_check CHECK (org_type IN ('club', 'school', 'national'));

UPDATE public.clubs SET org_type = 'school' WHERE name ILIKE '%high school%' OR name ILIKE '%school%';

ALTER TABLE public.transfers
  ADD COLUMN IF NOT EXISTS org_type text NOT NULL DEFAULT 'club';

ALTER TABLE public.transfers
  ADD CONSTRAINT transfers_org_type_check CHECK (org_type IN ('club', 'school', 'national'));

UPDATE public.transfers t
SET org_type = 'school'
WHERE EXISTS (
  SELECT 1 FROM public.clubs c
  WHERE c.org_type = 'school' AND c.id IN (t.from_club_id, t.to_club_id)
);

UPDATE public.transfers t
SET org_type = 'national'
WHERE EXISTS (
  SELECT 1 FROM public.clubs c
  WHERE c.org_type = 'national' AND c.id IN (t.from_club_id, t.to_club_id)
);