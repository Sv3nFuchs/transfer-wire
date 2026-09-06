-- ===== 20260807172425_e1b54ee7-4b87-4f3b-a486-7db42824ccee.sql =====
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'New user',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1), 'New user'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text NOT NULL DEFAULT 'Sweden',
  city text,
  level text,
  founded_year int,
  description text,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.clubs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clubs TO authenticated;
GRANT ALL ON public.clubs TO service_role;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clubs_public_read" ON public.clubs FOR SELECT USING (true);
CREATE POLICY "clubs_insert_auth" ON public.clubs FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "clubs_update_own" ON public.clubs FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE POLICY "clubs_delete_own" ON public.clubs FOR DELETE TO authenticated USING (auth.uid() = created_by);

CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name text NOT NULL,
  age_group text,
  league text,
  season text,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.teams TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teams_public_read" ON public.teams FOR SELECT USING (true);
CREATE POLICY "teams_insert_auth" ON public.teams FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "teams_update_own" ON public.teams FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE POLICY "teams_delete_own" ON public.teams FOR DELETE TO authenticated USING (auth.uid() = created_by);

CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  birth_year int,
  position text,
  preferred_foot text,
  height_cm int,
  nationality text,
  bio text,
  club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  shirt_number int,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.players TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.players TO authenticated;
GRANT ALL ON public.players TO service_role;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "players_public_read" ON public.players FOR SELECT USING (true);
CREATE POLICY "players_insert_auth" ON public.players FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "players_update_own" ON public.players FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE POLICY "players_delete_own" ON public.players FOR DELETE TO authenticated USING (auth.uid() = created_by);

CREATE INDEX players_club_idx ON public.players(club_id);
CREATE INDEX players_team_idx ON public.players(team_id);
CREATE INDEX teams_club_idx ON public.teams(club_id);

-- ===== 20260807172435_0df3eb22-67fe-45cc-a8a4-2e4ca9f9ae4f.sql =====
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;

-- ===== 20260807173302_c581a4e1-ebd2-411e-858f-875fedb07071.sql =====
ALTER TABLE public.clubs ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.teams ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.players ALTER COLUMN created_by DROP NOT NULL;

-- ===== 20260812122645_f5f694ad-982f-4ef9-a1a2-13c8f014abbc.sql =====
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_roles_select_own" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "clubs_admin_update" ON public.clubs
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "clubs_admin_delete" ON public.clubs
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "teams_admin_update" ON public.teams
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "teams_admin_delete" ON public.teams
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "players_admin_update" ON public.players
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "players_admin_delete" ON public.players
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ===== 20260812122733_0c2312f7-f4cf-4c51-8d13-9cd663af0d2f.sql =====
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

-- ===== 20260812122806_a8307485-8bb0-4fdd-a055-44f998d6548b.sql =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1), 'New user'))
  ON CONFLICT (id) DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- ===== 20260820081503_0d8ac21f-a5e4-4252-ad72-894309245889.sql =====
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS flag_1 text,
  ADD COLUMN IF NOT EXISTS flag_2 text;

ALTER TABLE public.players
  ADD CONSTRAINT players_flag_1_format CHECK (flag_1 IS NULL OR flag_1 ~ '^[A-Z]{2}$'),
  ADD CONSTRAINT players_flag_2_format CHECK (flag_2 IS NULL OR flag_2 ~ '^[A-Z]{2}$');

-- ===== 20260822060243_fd80347f-4a95-404c-bd5c-36c8170dc95e.sql =====
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

-- ===== 20260901110434_29544d4f-6767-466d-9cfa-8858ca8b6cba.sql =====
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS logo_url text;

-- Create the private club-logos storage bucket (was set up manually on the old project, not in a migration)
INSERT INTO storage.buckets (id, name, public) VALUES ('club-logos', 'club-logos', false) ON CONFLICT (id) DO NOTHING;

-- ===== 20260901110512_9a7dc63f-8d97-447d-97df-d604561825da.sql =====
CREATE POLICY "club_logos_read_auth" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'club-logos');
CREATE POLICY "club_logos_admin_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'club-logos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "club_logos_admin_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'club-logos' AND public.has_role(auth.uid(), 'admin')) WITH CHECK (bucket_id = 'club-logos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "club_logos_admin_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'club-logos' AND public.has_role(auth.uid(), 'admin'));

-- ===== 20260904062552_c35e2fea-8c57-40c2-85eb-9a0af0e27863.sql =====
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

-- ===== 20260906071434_939d4f2b-ed03-4ab6-b237-7de575344239.sql =====
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

-- ===== 20260906071509_1a47d3b8-b002-4851-b34c-72de7e678e40.sql =====
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

