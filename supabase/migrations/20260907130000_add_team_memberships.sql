-- Records that a player was part of a team's roster, independent of any
-- match/rating data. Lets a player's history include a past-season team
-- (e.g. one they moved on from) without needing a logged match to anchor it.
CREATE TABLE public.team_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, team_id)
);

GRANT SELECT ON public.team_memberships TO anon;
GRANT SELECT, INSERT, DELETE ON public.team_memberships TO authenticated;
GRANT ALL ON public.team_memberships TO service_role;
ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY team_memberships_public_read ON public.team_memberships FOR SELECT USING (true);
CREATE POLICY team_memberships_insert_auth ON public.team_memberships FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY team_memberships_delete_own ON public.team_memberships FOR DELETE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY team_memberships_admin_delete ON public.team_memberships FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX team_memberships_player_idx ON public.team_memberships(player_id);
