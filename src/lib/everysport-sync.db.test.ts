import { randomBytes } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { syncTeamFixtures } from "./everysport-sync.server";
import { everysportPageHtml, game, ME } from "./everysport-sync.fixtures";

// Runs the real sync twice against the real Supabase project, using throwaway
// rows it deletes afterwards. Opt in with: npm run test:db
const enabled = process.env["RUN_DB_TESTS"] === "1" && !!process.env["SUPABASE_SERVICE_ROLE_KEY"];

describe.skipIf(!enabled)("syncTeamFixtures against the database", () => {
  const tag = randomBytes(4).toString("hex");
  const league = `ZZ Test League ${tag}`;
  const opponent = { id: `zz-test-${tag}`, name: `ZZ Test Rival ${tag}`, logo: null };
  const supabase = createClient<Database>(process.env["SUPABASE_URL"]!, process.env["SUPABASE_SERVICE_ROLE_KEY"]!, {
    auth: { persistSession: false },
  });
  let userId = "";
  let clubId = "";
  let teamId = "";

  beforeAll(async () => {
    const { data: user, error: userError } = await supabase.auth.admin.createUser({
      email: `zz-test-sync-${tag}@example.com`,
      password: randomBytes(18).toString("hex"),
      email_confirm: true,
    });
    if (userError) throw userError;
    userId = user.user.id;

    const { data: club, error: clubError } = await supabase
      .from("clubs")
      .insert({ name: `ZZ Test Club ${tag}`, created_by: userId })
      .select("id")
      .single();
    if (clubError) throw clubError;
    clubId = club.id;

    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({ club_id: clubId, name: `ZZ Test Team ${tag}`, league, created_by: userId })
      .select("id")
      .single();
    if (teamError) throw teamError;
    teamId = team.id;
  });

  afterEach(() => vi.unstubAllGlobals());

  afterAll(async () => {
    if (teamId) await supabase.from("matches").delete().eq("team_id", teamId);
    await supabase.from("league_standings").delete().eq("league", league);
    if (teamId) await supabase.from("teams").delete().eq("id", teamId);
    if (clubId) await supabase.from("clubs").delete().eq("id", clubId);
    if (userId) await supabase.auth.admin.deleteUser(userId);
  });

  async function matchRows() {
    const { data, error } = await supabase
      .from("matches")
      .select("external_id, team_score, opponent_score")
      .eq("team_id", teamId)
      .order("external_id");
    if (error) throw error;
    return data;
  }

  it("running the sync twice leaves one row per game and picks up a changed score", async () => {
    const team = { id: teamId, league, everysport_url: "https://www.everysport.com/team/1" };
    // Only Everysport requests are faked; the Supabase client's own requests go through.
    const realFetch = globalThis.fetch;
    const serve = (games: ReturnType<typeof game>[]) => {
      const html = everysportPageHtml({ games, table: [{ team: ME, pts: 3 }, { team: opponent, pts: 0 }] });
      vi.stubGlobal("fetch", (input: Parameters<typeof fetch>[0], init?: RequestInit) =>
        String(input).includes("everysport.com") ? Promise.resolve(new Response(html)) : realFetch(input, init),
      );
    };
    const games = [game(`g1-${tag}`, "2026-05-01", ME, opponent, null), game(`g2-${tag}`, "2026-05-08", opponent, ME, [0, 2])];

    serve(games);
    await syncTeamFixtures(supabase, team);
    expect(await matchRows()).toHaveLength(2);

    // Same data again: still two rows, not four.
    await syncTeamFixtures(supabase, team);
    expect(await matchRows()).toHaveLength(2);

    // The unplayed game now has a result: the existing row is updated.
    serve([game(`g1-${tag}`, "2026-05-01", ME, opponent, [4, 1]), games[1]!]);
    await syncTeamFixtures(supabase, team);
    const rows = await matchRows();
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.external_id === `g1-${tag}`)).toMatchObject({ team_score: 4, opponent_score: 1 });

    // The league table is replaced each run, not appended to.
    const { count } = await supabase.from("league_standings").select("*", { count: "exact", head: true }).eq("league", league);
    expect(count).toBe(2);
  });

  it("the database itself refuses a second row with the same Everysport id", async () => {
    const duplicate = {
      team_id: teamId,
      opponent_name: opponent.name,
      match_date: "2026-05-01",
      home_away: "home",
      external_source: "everysport",
      external_id: `g1-${tag}`,
    };
    const { error } = await supabase.from("matches").insert(duplicate);
    expect(error?.code).toBe("23505"); // unique_violation
  });
});
