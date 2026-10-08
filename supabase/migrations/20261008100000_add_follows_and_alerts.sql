-- Following: a signed-in user can follow a club, team or player and see their
-- fixtures, results and ratings as alerts. Both tables are private to the
-- user (row level security), so nobody can see who follows whom.

CREATE TABLE public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('club', 'team', 'player')),
  target_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_type, target_id)
);

CREATE INDEX follows_user_id_idx ON public.follows (user_id);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own follows"
  ON public.follows FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users add their own follows"
  ON public.follows FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users remove their own follows"
  ON public.follows FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Which alerts a user has already seen. event_key looks like
-- 'result:<match id>', 'fixture:<match id>' or 'rating:<rating id>'.
CREATE TABLE public.alert_reads (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_key text NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event_key)
);

ALTER TABLE public.alert_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own alert reads"
  ON public.alert_reads FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users add their own alert reads"
  ON public.alert_reads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
