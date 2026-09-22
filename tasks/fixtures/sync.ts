import { defineTask } from "nitro/task";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { syncTeamFixtures } from "@/lib/everysport-sync.server";

// Keeps fixtures and results current without an admin manually clicking
// "Sync fixtures" — runs on the Cloudflare Cron Trigger set up in
// vite.config.ts's scheduledTasks. Covers every team with an
// everysport_url set, not just the ones synced by hand so far.
export default defineTask({
  meta: {
    name: "fixtures:sync",
    description: "Re-sync every team's fixtures/results from Everysport",
  },
  async run() {
    const { data: teams, error } = await supabaseAdmin
      .from("teams")
      .select("id, league, everysport_url")
      .not("everysport_url", "is", null);
    if (error) throw new Error(error.message);

    const results: { teamId: string; imported?: number; tableRows?: number; error?: string }[] = [];
    for (const team of teams ?? []) {
      try {
        const { imported, tableRows } = await syncTeamFixtures(supabaseAdmin, team);
        results.push({ teamId: team.id, imported, tableRows });
      } catch (err) {
        results.push({ teamId: team.id, error: err instanceof Error ? err.message : String(err) });
      }
    }

    return { result: results };
  },
});
