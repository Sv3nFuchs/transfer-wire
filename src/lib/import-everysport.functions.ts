import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { syncTeamFixtures } from "./everysport-sync.server";

export const syncEverysportFixtures = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { teamId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminRole) throw new Error("Only an admin can sync fixtures.");

    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id, league, everysport_url")
      .eq("id", data.teamId)
      .maybeSingle();
    if (teamError) throw new Error(teamError.message);
    if (!team) throw new Error("Team not found.");

    return syncTeamFixtures(supabase, team, userId);
  });
