import { createServerFn } from "@tanstack/react-start";
import { createPublicClient } from "./public-client.server";

export const listPlayers = createServerFn({ method: "GET" })
  .inputValidator((input: { q?: string } | undefined) => input ?? {})
  .handler(async ({ data }) => {
    const supabase = createPublicClient();
    let query = supabase
      .from("players")
      .select(
        "id, full_name, birth_year, position, nationality, shirt_number, club_id, team_id, clubs(name, city, level), teams(name, age_group)",
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
      .select("*, clubs(id, name, city, level, country), teams(id, name, age_group, league, season)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const listClubs = createServerFn({ method: "GET" })
  .inputValidator((input: { q?: string } | undefined) => input ?? {})
  .handler(async ({ data }) => {
    const supabase = createPublicClient();
    let query = supabase
      .from("clubs")
      .select("id, name, city, country, level, founded_year, teams(id), players(id)")
      .order("name", { ascending: true })
      .limit(60);
    if (data.q) query = query.ilike("name", `%${data.q}%`);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return (rows ?? []).map((club) => ({
      id: club.id,
      name: club.name,
      city: club.city,
      country: club.country,
      level: club.level,
      founded_year: club.founded_year,
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
      .select("id, full_name, position, birth_year, shirt_number, nationality, team_id")
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
