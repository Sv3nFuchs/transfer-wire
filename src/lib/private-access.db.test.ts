import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Checks the live Supabase project from the outside: a logged-out visitor
// holding only the public key must be refused, a signed-in user must not be.
// Opt in with: npm run test:db
const enabled = process.env["RUN_DB_TESTS"] === "1" && !!process.env["SUPABASE_SERVICE_ROLE_KEY"];

const TABLES = [
  "clubs",
  "teams",
  "players",
  "transfers",
  "matches",
  "match_player_ratings",
  "player_season_stats",
  "league_standings",
  "team_memberships",
  "profiles",
] as const;

describe.skipIf(!enabled)("the database is private", () => {
  const url = process.env["SUPABASE_URL"]!;
  const publicKey = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient<Database>(url, process.env["SUPABASE_SERVICE_ROLE_KEY"]!, options);
  const anon = createClient<Database>(url, publicKey, options);
  const email = `zz-test-private-${randomBytes(4).toString("hex")}@example.com`;
  const password = randomBytes(18).toString("hex");
  let userId = "";

  beforeAll(async () => {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    userId = data.user.id;
  });

  afterAll(async () => {
    if (userId) {
      await admin.from("user_roles").delete().eq("user_id", userId);
      await admin.auth.admin.deleteUser(userId);
    }
  });

  it.each(TABLES)("a logged-out visitor cannot read %s", async (table) => {
    const { data, error } = await anon.from(table).select("*").limit(1);
    // Refused outright (permission denied) or at least nothing returned.
    expect(data ?? []).toEqual([]);
    if (!error) throw new Error(`${table}: the query was allowed but returned no rows; expected a refusal`);
  });

  it("open sign-ups are switched off", async () => {
    // Read the project's public auth settings rather than really signing up,
    // which would email a confirmation to a made-up address.
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: publicKey } });
    const settings = (await res.json()) as { disable_signup?: boolean };
    expect(settings.disable_signup).toBe(true);
  });

  it.each(TABLES.filter((t) => t !== "profiles"))("a signed-in user can read %s", async (table) => {
    const user = createClient<Database>(url, publicKey, options);
    const { error: signInError } = await user.auth.signInWithPassword({ email, password });
    expect(signInError).toBeNull();
    const { error } = await user.from(table).select("*").limit(1);
    expect(error).toBeNull();
  });
});
