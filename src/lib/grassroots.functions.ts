import { createServerFn } from "@tanstack/react-start";
import { createPublicClient } from "./public-client.server";
import { resolveLogoUrls, applyLogo } from "./logo-urls.server";

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
      .select(
        "*, clubs(id, name, city, level, country, country_code, logo_url), teams(id, name, age_group, league, season), transfers(id, transfer_date, transfer_type, note, org_type, from_club_id, to_club_id, from_club_name, to_club_name, from_club:clubs!transfers_from_club_id_fkey(id, name, logo_url, org_type, country_code), to_club:clubs!transfers_to_club_id_fkey(id, name, logo_url, org_type, country_code)), season_stats:player_season_stats(season, league, matches_played, goals, rated_matches, average_rating, teams(name, clubs(name))), team_memberships(id, team_id, teams(name, season, league, clubs(name))), match_ratings:match_player_ratings(id, team_id, season, rating, goals_scored, teams(id, name, clubs(name)), matches(id, match_date, opponent_name, competition))",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const rawTransfers = [...(row.transfers ?? [])].sort((a, b) =>
      (b.transfer_date ?? "").localeCompare(a.transfer_date ?? ""),
    );
    const logoMap = await resolveLogoUrls([
      ...rawTransfers.flatMap((transfer) => [transfer.from_club?.logo_url, transfer.to_club?.logo_url]),
      row.clubs?.logo_url,
    ]);
    const transfers = rawTransfers.map((transfer) => ({
      ...transfer,
      from_club: transfer.from_club
        ? { ...transfer.from_club, logo_url: applyLogo(transfer.from_club.logo_url, logoMap) }
        : null,
      to_club: transfer.to_club
        ? { ...transfer.to_club, logo_url: applyLogo(transfer.to_club.logo_url, logoMap) }
        : null,
    }));
    const currentClub = row.clubs
      ? { ...row.clubs, logo_url: applyLogo(row.clubs.logo_url, logoMap) }
      : null;
    const seasonStats = [...(row.season_stats ?? [])].sort((a, b) => (b.season ?? "").localeCompare(a.season ?? ""));
    const teamMemberships = [...(row.team_memberships ?? [])].sort((a, b) =>
      (b.teams?.season ?? "").localeCompare(a.teams?.season ?? ""),
    );

    // High school / college teams — clubs aren't tagged school vs. non-school,
    // and a "School Spell" transfer's two legs (entry/exit) put the school on
    // opposite sides, so neither club alone is a reliable signal. Instead: a
    // club counts as a school only if EVERY transfer mentioning it is a
    // school-spell transfer — the player's regular club on the other end of
    // that spell will also show up in ordinary club-type transfers, so it
    // gets excluded.
    type SchoolEntry = { id: string; name: string; logoUrl: string | null; date: string | null };
    const clubOrgTypes = new Map<string, Set<string>>();
    const clubInfo = new Map<string, { name: string; logoUrl: string | null }>();
    const lastSchoolDate = new Map<string, string | null>();
    for (const transfer of transfers) {
      const orgType = transfer.org_type ?? "club";
      const sides = [
        { key: transfer.to_club?.id ?? transfer.to_club_name, name: transfer.to_club?.name ?? transfer.to_club_name, logoUrl: transfer.to_club?.logo_url ?? null },
        { key: transfer.from_club?.id ?? transfer.from_club_name, name: transfer.from_club?.name ?? transfer.from_club_name, logoUrl: transfer.from_club?.logo_url ?? null },
      ];
      for (const side of sides) {
        if (!side.key) continue;
        if (!clubOrgTypes.has(side.key)) clubOrgTypes.set(side.key, new Set());
        clubOrgTypes.get(side.key)!.add(orgType);
        if (!clubInfo.has(side.key)) clubInfo.set(side.key, { name: side.name ?? "", logoUrl: side.logoUrl });
        if (orgType === "school") {
          const existing = lastSchoolDate.get(side.key);
          if (!existing || (transfer.transfer_date ?? "") > existing) lastSchoolDate.set(side.key, transfer.transfer_date);
        }
      }
    }
    const schools: SchoolEntry[] = [...clubOrgTypes.entries()]
      .filter(([, types]) => types.size === 1 && types.has("school"))
      .map(([key]) => ({
        id: key,
        name: clubInfo.get(key)?.name ?? "",
        logoUrl: clubInfo.get(key)?.logoUrl ?? null,
        date: lastSchoolDate.get(key) ?? null,
      }))
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

    const ratedMatches = (row.match_ratings ?? []).filter((r) => r.matches?.match_date);

    type DebutEntry = {
      id: string;
      teamId: string;
      teamName: string | null;
      clubName: string | null;
      matchDate: string | null;
      opponentName: string | null;
      season: string | null;
    };
    const debutByTeam = new Map<string, DebutEntry>();
    for (const r of ratedMatches) {
      const existing = debutByTeam.get(r.team_id);
      if (!existing || (existing.matchDate && r.matches!.match_date < existing.matchDate)) {
        debutByTeam.set(r.team_id, {
          id: r.id,
          teamId: r.team_id,
          teamName: r.teams?.name ?? null,
          clubName: r.teams?.clubs?.name ?? null,
          matchDate: r.matches!.match_date,
          opponentName: r.matches?.opponent_name ?? null,
          season: null,
        });
      }
    }
    // Past teams claimed via "Past Teams" (team_memberships) but with no
    // logged match yet still get a debut entry, just without an exact date.
    for (const membership of teamMemberships) {
      if (!membership.team_id || debutByTeam.has(membership.team_id)) continue;
      debutByTeam.set(membership.team_id, {
        id: membership.id,
        teamId: membership.team_id,
        teamName: membership.teams?.name ?? null,
        clubName: membership.teams?.clubs?.name ?? null,
        matchDate: null,
        opponentName: null,
        season: membership.teams?.season ?? null,
      });
    }
    const debuts = [...debutByTeam.values()].sort((a, b) => {
      if (a.matchDate && b.matchDate) return b.matchDate.localeCompare(a.matchDate);
      if (a.matchDate) return -1;
      if (b.matchDate) return 1;
      return (b.season ?? "").localeCompare(a.season ?? "");
    });
    const goals = ratedMatches
      .filter((r) => r.goals_scored > 0)
      .sort((a, b) => (b.matches?.match_date ?? "").localeCompare(a.matches?.match_date ?? ""));

    // In-depth per-match log for the Statistics tab, grouped by season.
    const matchLogBySeason = new Map<string, typeof ratedMatches>();
    for (const r of ratedMatches) {
      const season = r.season || "—";
      const bucket = matchLogBySeason.get(season);
      if (bucket) bucket.push(r);
      else matchLogBySeason.set(season, [r]);
    }
    const matchLog = [...matchLogBySeason.entries()]
      .map(([season, matches]) => ({
        season,
        matches: [...matches].sort((a, b) => (b.matches?.match_date ?? "").localeCompare(a.matches?.match_date ?? "")),
      }))
      .sort((a, b) => b.season.localeCompare(a.season));

    const { match_ratings: _matchRatings, ...playerRow } = row;
    return {
      ...playerRow,
      clubs: currentClub,
      transfers,
      season_stats: seasonStats,
      team_memberships: teamMemberships,
      debuts,
      goals,
      match_log: matchLog,
      schools,
    };
  });

export const listClubs = createServerFn({ method: "GET" })
  .inputValidator((input: { q?: string } | undefined) => input ?? {})
  .handler(async ({ data }) => {
    const supabase = createPublicClient();
    let query = supabase
      .from("clubs")
      .select("id, name, city, country, country_code, level, founded_year, logo_url, teams(id), players(id)")
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
      country_code: club.country_code,
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
      .select("id, full_name, position, birth_year, shirt_number, nationality, team_id")
      .eq("club_id", data.id)
      .order("full_name");
    if (playersError) throw new Error(playersError.message);

    const teamIds = club.teams.map((team) => team.id);
    const { data: memberships, error: membershipsError } =
      teamIds.length === 0
        ? { data: [], error: null }
        : await supabase
            .from("team_memberships")
            .select("team_id, players(id, full_name, position, birth_year, shirt_number, nationality)")
            .in("team_id", teamIds);
    if (membershipsError) throw new Error(membershipsError.message);

    const logoMap = await resolveLogoUrls([club.logo_url]);
    const pastPlayersByTeam: Record<string, NonNullable<(typeof memberships)[number]["players"]>[]> = {};
    for (const row of memberships ?? []) {
      if (!row.players) continue;
      (pastPlayersByTeam[row.team_id] ??= []).push(row.players);
    }
    return {
      club: { ...club, logo_url: applyLogo(club.logo_url, logoMap) },
      players: players ?? [],
      pastPlayersByTeam,
    };
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
