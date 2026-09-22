import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type RosterPlayerNode = {
  jerseyNumber: string | null;
  player: { name: string | null } | null;
};

/**
 * Parses a ScoreBookLive-family site's team roster page (e.g. scores.cifss.org)
 * out of its Next.js __NEXT_DATA__ embed. Other roster sources would need
 * their own parser here.
 */
function parseRosterPage(html: string): RosterPlayerNode[] {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match?.[1]) {
    throw new Error("Could not find roster data on the page — its layout may have changed.");
  }
  let json: unknown;
  try {
    json = JSON.parse(match[1]);
  } catch {
    throw new Error("Could not parse the roster page's data.");
  }
  const query = (json as { props?: { pageProps?: { query?: unknown } } }).props?.pageProps?.query as
    | { team?: { teamPlayers?: { nodes?: RosterPlayerNode[] } } }
    | undefined;
  const nodes = query?.team?.teamPlayers?.nodes;
  if (!nodes) {
    throw new Error("Could not find a player roster on that page.");
  }
  return nodes;
}

export const syncTeamRoster = createServerFn({ method: "POST" })
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
    if (!adminRole) throw new Error("Only an admin can sync a roster.");

    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id, roster_url")
      .eq("id", data.teamId)
      .maybeSingle();
    if (teamError) throw new Error(teamError.message);
    if (!team?.roster_url) throw new Error("This team has no roster URL set.");

    const res = await fetch(team.roster_url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; TransferWire/1.0)" },
    });
    if (!res.ok) throw new Error(`Roster request failed: ${res.status} ${res.statusText}`);
    const nodes = parseRosterPage(await res.text());

    const names = [...new Set(nodes.map((n) => n.player?.name?.trim()).filter((n): n is string => !!n))];
    if (names.length === 0) return { linked: 0, skipped: 0, skippedNames: [] };

    const { data: matchedPlayers, error: playersError } = await supabase
      .from("players")
      .select("id, full_name")
      .in("full_name", names);
    if (playersError) throw new Error(playersError.message);

    const byName = new Map((matchedPlayers ?? []).map((p) => [p.full_name.toLowerCase(), p.id]));
    const linkedIds: string[] = [];
    const skippedNames: string[] = [];
    for (const name of names) {
      const playerId = byName.get(name.toLowerCase());
      if (playerId) linkedIds.push(playerId);
      else skippedNames.push(name);
    }

    if (linkedIds.length > 0) {
      const rows = linkedIds.map((playerId) => ({ player_id: playerId, team_id: data.teamId, created_by: userId }));
      // ignoreDuplicates (ON CONFLICT DO NOTHING) rather than update-on-conflict:
      // a membership row has nothing to update, and there's no UPDATE policy on
      // this table (only insert/delete), so a real upsert would be blocked by RLS.
      const { error: upsertError } = await supabase
        .from("team_memberships")
        .upsert(rows, { onConflict: "player_id,team_id", ignoreDuplicates: true });
      if (upsertError) throw new Error(`Could not save roster links: ${upsertError.message}`);
    }

    return { linked: linkedIds.length, skipped: skippedNames.length, skippedNames };
  });
