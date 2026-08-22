CREATE TABLE public.transfers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  from_club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL,
  to_club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL,
  from_club_name text,
  to_club_name text,
  transfer_date date,
  transfer_type text,
  note text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.transfers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transfers TO authenticated;
GRANT ALL ON public.transfers TO service_role;

ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY transfers_public_read ON public.transfers FOR SELECT USING (true);
CREATE POLICY transfers_insert_auth ON public.transfers FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY transfers_update_own ON public.transfers FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE POLICY transfers_delete_own ON public.transfers FOR DELETE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY transfers_admin_update ON public.transfers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY transfers_admin_delete ON public.transfers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX transfers_player_id_idx ON public.transfers(player_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_transfers_updated_at
  BEFORE UPDATE ON public.transfers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();