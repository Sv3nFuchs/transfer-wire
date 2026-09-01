import { createServerFn } from "@tanstack/react-start";
import { createPublicClient } from "./public-client.server";

/**
 * logo_url holds either an external https URL or a path inside the private
 * club-logos bucket. Bucket paths are turned into signed URLs for display.
 */
async function resolveLogoUrls(paths: (string | null | undefined)[]) {
  const storagePaths = [
    ...new Set(paths.filter((p): p is string => !!p && !/^https?:\/\//.test(p))),
  ];
  const map = new Map<string, string>();
  if (storagePaths.length === 0) return map;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage
    .from("club-logos")
    .createSignedUrls(storagePaths, 60 * 60 * 24 * 7);
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) map.set(item.path, item.signedUrl);
  }
  return map;
}

function applyLogo(url: string | null | undefined, map: Map<string, string>) {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  return map.get(url) ?? null;
}

export const listPlayers = createServerFn({ method: "GET" })
  .inputValidator((input: { q?: string } | undefined) => input ?? {})
  .handler(async ({ data }) => {
    const supabase = createPublicClient();
    let query = supabase
      .from("players")
      .select(
        "id, full_name, birth_year, position, nationality, flag_1, flag_2, shirt_number, club_id, team_id, clubs(name, city, level), teams(name, age_group)",
      )
      .order("created_at", { ascending: false })
      .limit(60);
    if (data.q) query = query.ilike("full_name", `%${data.q}%`);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getPlayer = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const supabase = createPublicClient();
    const { data: row, error } = await supabase
      .from("players")
      .select(
        "*, clubs(id, name, city, level, country), teams(id, name, age_group, league, season), transfers(id, transfer_date, transfer_type, note, from_club_id, to_club_id, from_club_name, to_club_name, from_club:clubs!transfers_from_club_id_fkey(id, name), to_club:clubs!transfers_to_club_id_fkey(id, name))",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const transfers = [...(row.transfers ?? [])].sort((a, b) =>
      (a.transfer_date ?? "").localeCompare(b.transfer_date ?? ""),
    );
    return { ...row, transfers };
  });

export const listClubs = createServerFn({ method: "GET" })
  .inputValidator((input: { q?: string } | undefined) => input ?? {})
  .handler(async ({ data }) => {
    const supabase = createPublicClient();
    let query = supabase
      .from("clubs")
      .select("id, name, city, country, level, founded_year, logo_url, teams(id), players(id)")
      .order("name", { ascending: true })
      .limit(60);
    if (data.q) query = query.ilike("name", `%${data.q}%`);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const logoMap = await resolveLogoUrls((rows ?? []).map((club) => club.logo_url));
    return (rows ?? []).map((club) => ({
      id: club.id,
      name: club.name,
      city: club.city,
      country: club.country,
      level: club.level,
      founded_year: club.founded_year,
      logo_url: applyLogo(club.logo_url, logoMap),
      team_count: club.teams?.length ?? 0,
      player_count: club.players?.length ?? 0,
    }));
  });

export const getClub = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const supabase = createPublicClient();
    const { data: club, error } = await supabase
      .from("clubs")
      .select("*, teams(id, name, age_group, league, season)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!club) return null;
    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("id, full_name, position, birth_year, shirt_number, nationality, flag_1, flag_2, team_id")
      .eq("club_id", data.id)
      .order("full_name");
    if (playersError) throw new Error(playersError.message);
    return { club, players: players ?? [] };
  });

export const getOverview = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createPublicClient();
  const [players, clubs, teams, latest] = await Promise.all([
    supabase.from("players").select("id", { count: "exact", head: true }),
    supabase.from("clubs").select("id", { count: "exact", head: true }),
    supabase.from("teams").select("id", { count: "exact", head: true }),
    supabase
      .from("players")
      .select("id, full_name, position, birth_year, clubs(name)")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);
  return {
    playerCount: players.count ?? 0,
    clubCount: clubs.count ?? 0,
    teamCount: teams.count ?? 0,
    latestPlayers: latest.data ?? [],
  };
});
