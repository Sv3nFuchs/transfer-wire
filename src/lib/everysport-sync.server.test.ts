import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { syncTeamFixtures } from "./everysport-sync.server";
import { everysportPageHtml, game, ME, OPPONENT } from "./everysport-sync.fixtures";

type Op = { table: string; op: "upsert" | "delete" | "insert"; payload?: unknown; options?: unknown; filter?: unknown };

/** Records what the sync writes. Opponent lookups find nothing, so they stay unlinked. */
function fakeSupabase() {
  const ops: Op[] = [];
  const lookup = {
    select: () => lookup,
    eq: () => lookup,
    ilike: () => lookup,
    maybeSingle: async () => ({ data: null, error: null }),
  };
  const client = {
    from(table: string) {
      return {
        ...lookup,
        upsert: async (payload: unknown, options: unknown) => {
          ops.push({ table, op: "upsert", payload, options });
          return { error: null };
        },
        insert: async (payload: unknown) => {
          ops.push({ table, op: "insert", payload });
          return { error: null };
        },
        delete: () => ({
          eq: async (column: string, value: unknown) => {
            ops.push({ table, op: "delete", filter: { [column]: value } });
            return { error: null };
          },
        }),
      };
    },
  };
  return { supabase: client as unknown as SupabaseClient<Database>, ops };
}

function serve(html: string) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(html)));
}

afterEach(() => vi.unstubAllGlobals());

const TEAM = { id: "team-1", league: "Test League", everysport_url: "https://www.everysport.com/team/1" };
const matchUpserts = (ops: Op[]) => ops.filter((o) => o.table === "matches" && o.op === "upsert");

describe("syncTeamFixtures", () => {
  it("saves each game by its Everysport id, so a re-run updates instead of duplicating", async () => {
    serve(everysportPageHtml({ games: [game("g1", "2026-05-01", ME, OPPONENT, [2, 1]), game("g2", "2026-05-08", OPPONENT, ME, null)] }));

    const { supabase, ops } = fakeSupabase();
    await syncTeamFixtures(supabase, TEAM);
    await syncTeamFixtures(supabase, TEAM);

    const upserts = matchUpserts(ops);
    expect(upserts).toHaveLength(4);
    for (const call of upserts) {
      expect(call.options).toEqual({ onConflict: "external_source,external_id" });
    }
    const keys = (rows: Op[]) => rows.map((c) => `${(c.payload as any).external_source}:${(c.payload as any).external_id}`);
    // The second run sends exactly the same keys as the first — the database's
    // UNIQUE (external_source, external_id) turns those into updates.
    expect(keys(upserts.slice(2))).toEqual(keys(upserts.slice(0, 2)));
    expect(new Set(keys(upserts)).size).toBe(2);
  });

  it("maps the score and home/away from our team's point of view", async () => {
    serve(everysportPageHtml({ games: [game("g1", "2026-05-01", ME, OPPONENT, [2, 1]), game("g2", "2026-05-08", OPPONENT, ME, [3, 0])] }));
    const { supabase, ops } = fakeSupabase();
    await syncTeamFixtures(supabase, TEAM);

    const [home, away] = matchUpserts(ops).map((o) => o.payload as any);
    expect(home).toMatchObject({ home_away: "home", team_score: 2, opponent_score: 1, opponent_name: OPPONENT.name });
    expect(away).toMatchObject({ home_away: "away", team_score: 0, opponent_score: 3 });
  });

  it("stores an unplayed game with empty scores and skips a game with no date", async () => {
    serve(everysportPageHtml({ games: [game("g1", "2026-09-01", ME, OPPONENT, null), game("g2", "", ME, OPPONENT, [1, 1])] }));
    const { supabase, ops } = fakeSupabase();
    const { imported } = await syncTeamFixtures(supabase, TEAM);

    expect(imported).toBe(1);
    expect(matchUpserts(ops)[0]?.payload).toMatchObject({ team_score: null, opponent_score: null });
  });

  it("leaves created_by out for the scheduled run and sets it for an admin's run", async () => {
    serve(everysportPageHtml({ games: [game("g1", "2026-05-01", ME, OPPONENT, [1, 0])] }));

    const cron = fakeSupabase();
    await syncTeamFixtures(cron.supabase, TEAM);
    expect(matchUpserts(cron.ops)[0]?.payload).not.toHaveProperty("created_by");

    const admin = fakeSupabase();
    await syncTeamFixtures(admin.supabase, TEAM, "user-1");
    expect(matchUpserts(admin.ops)[0]?.payload).toMatchObject({ created_by: "user-1" });
  });

  it("replaces the league table: deletes that league's rows, then inserts the fresh ones", async () => {
    serve(everysportPageHtml({ games: [], table: [{ team: ME, pts: 9 }, { team: OPPONENT, pts: 4 }] }));
    const { supabase, ops } = fakeSupabase();
    const { tableRows } = await syncTeamFixtures(supabase, TEAM);

    const table = ops.filter((o) => o.table === "league_standings");
    expect(table.map((o) => o.op)).toEqual(["delete", "insert"]);
    expect(table[0]?.filter).toEqual({ league: "Test League" });
    expect(tableRows).toBe(2);
    expect((table[1]?.payload as any[]).map((r) => [r.position, r.points])).toEqual([[1, 9], [2, 4]]);
  });

  it("does not touch the league table when the team has no league", async () => {
    serve(everysportPageHtml({ games: [], table: [{ team: ME, pts: 9 }] }));
    const { supabase, ops } = fakeSupabase();
    await syncTeamFixtures(supabase, { ...TEAM, league: null });
    expect(ops.filter((o) => o.table === "league_standings")).toEqual([]);
  });

  it("refuses a team with no URL and a URL on another site", async () => {
    const { supabase } = fakeSupabase();
    await expect(syncTeamFixtures(supabase, { ...TEAM, everysport_url: null })).rejects.toThrow(/no Everysport URL/);
    await expect(syncTeamFixtures(supabase, { ...TEAM, everysport_url: "https://evil.example.com/x" })).rejects.toThrow(/everysport\.com/);
  });

  it("fails clearly when Everysport's page layout changes", async () => {
    serve("<html><body>no embedded data</body></html>");
    const { supabase } = fakeSupabase();
    await expect(syncTeamFixtures(supabase, TEAM)).rejects.toThrow(/layout may have changed/);
  });
});
