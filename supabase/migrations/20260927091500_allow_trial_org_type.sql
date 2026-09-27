-- Trials are recorded as a transfers row with org_type = 'trial', but the
-- original check constraint only allowed 'club' / 'school' / 'national'.
ALTER TABLE public.transfers DROP CONSTRAINT transfers_org_type_check;
ALTER TABLE public.transfers
  ADD CONSTRAINT transfers_org_type_check CHECK (org_type IN ('club', 'school', 'national', 'trial'));
