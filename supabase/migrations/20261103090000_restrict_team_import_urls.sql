-- Bug: teams_update_own / teams_insert_auth let any signed-in user set a team's
-- everysport_url and roster_url (RLS is per row, not per column). The 3-hourly
-- fixtures:sync task fetches every team's everysport_url with full database
-- access and replaces league_standings for the team's league, so a regular user
-- could point their own team at a page they control, set league to a real
-- league's name, and overwrite that league's table.
--
-- Fix: only admins may set or change these two columns. Requests with no
-- signed-in user (the service role used by the cron task, or the SQL editor)
-- are left alone.
CREATE OR REPLACE FUNCTION public.restrict_team_import_urls()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.everysport_url IS NOT NULL OR NEW.roster_url IS NOT NULL THEN
      RAISE EXCEPTION 'Only an admin can set import URLs on a team.';
    END IF;
  ELSIF NEW.everysport_url IS DISTINCT FROM OLD.everysport_url
     OR NEW.roster_url IS DISTINCT FROM OLD.roster_url THEN
    RAISE EXCEPTION 'Only an admin can change import URLs on a team.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS teams_restrict_import_urls ON public.teams;
CREATE TRIGGER teams_restrict_import_urls
  BEFORE INSERT OR UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.restrict_team_import_urls();
