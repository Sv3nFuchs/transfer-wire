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
        "*, clubs(id, name, city, level, country, country_code, logo_url), teams(id, name, age_group, league, season), transfers(id, transfer_date, end_date, transfer_type, note, org_type, from_club_id, to_club_id, from_club_name, to_club_name, from_club:clubs!transfers_from_club_id_fkey(id, name, logo_url, org_type, country_code), to_club:clubs!transfers_to_club_id_fkey(id, name, logo_url, org_type, country_code)), season_stats:player_season_stats(season, league, matches_played, goals, rated_matches, average_rating, teams(name, clubs(name))), team_memberships(id, team_id, teams(name, season, league, clubs(name))), match_ratings:match_player_ratings(id, team_id, season, rating, goals_scored, teams(id, name, clubs(name)), matches(id, match_date, opponent_name, competition, team_score, opponent_score, opponent_logo_url, opponent_club:clubs!matches_opponent_club_id_fkey(name, logo_url)))",
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
      ...(row.match_ratings ?? []).flatMap((r) => [r.matches?.opponent_club?.logo_url, r.matches?.opponent_logo_url]),
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

    const ratedMatches = (row.match_ratings ?? [])
      .filter((r) => r.matches?.match_date)
      .map((r) => ({
        ...r,
        matches: r.matches
          ? {
              ...r.matches,
              opponent_logo_url:
                applyLogo(r.matches.opponent_club?.logo_url, logoMap) ??
                applyLogo(r.matches.opponent_logo_url, logoMap),
            }
          : null,
      }));

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

    // Last 5 rated matches, most recent first, for a Recent Form panel.
    const recentForm = [...ratedMatches]
      .sort((a, b) => (b.matches?.match_date ?? "").localeCompare(a.matches?.match_date ?? ""))
      .slice(0, 5)
      .map((r) => ({
        id: r.id,
        matchId: r.matches?.id ?? null,
        date: r.matches?.match_date ?? null,
        rating: r.rating,
        opponentName: r.matches?.opponent_name ?? null,
        opponentLogoUrl: r.matches?.opponent_logo_url ?? null,
        competition: r.matches?.competition ?? null,
        teamScore: r.matches?.team_score ?? null,
        opponentScore: r.matches?.opponent_score ?? null,
      }));

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
      recent_form: recentForm,
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

export type FormResult = "W" | "D" | "L";

export const getOverview = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createPublicClient();
  const [players, clubs, teams, latest, matchRows, crestRows, standingRows, statRows] = await Promise.all([
    supabase.from("players").select("id", { count: "exact", head: true }),
    supabase.from("clubs").select("id", { count: "exact", head: true }),
    supabase.from("teams").select("id", { count: "exact", head: true }),
    supabase
      .from("players")
      .select("id, full_name, position, birth_year, shirt_number, photo_url, clubs(name, logo_url)")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("matches")
      .select(
        "id, match_date, team_score, opponent_score, opponent_name, opponent_logo_url, team_id, teams(id, name, clubs(name, logo_url)), opponent_club:clubs!matches_opponent_club_id_fkey(name, logo_url)",
      )
      .order("match_date", { ascending: false })
      .limit(150),
    supabase.from("clubs").select("id, name, logo_url").not("logo_url", "is", null).limit(60),
    supabase
      .from("league_standings")
      .select("league, position, team_name, team_logo_url, played, goals_for, goals_against, points")
      .order("position", { ascending: true }),
    supabase
      .from("player_season_stats")
      .select("player_id, goals, rated_matches, average_rating, players(full_name, photo_url), teams(name, clubs(name))"),
  ]);

  const logoMap = await resolveLogoUrls([
    ...(latest.data ?? []).map((row) => row.clubs?.logo_url),
    ...(matchRows.data ?? []).flatMap((row) => [row.teams?.clubs?.logo_url, row.opponent_club?.logo_url]),
    ...(crestRows.data ?? []).map((row) => row.logo_url),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const matches = (matchRows.data ?? []).map((row) => ({
    id: row.id,
    date: row.match_date,
    teamId: row.team_id,
    teamName: row.teams?.clubs?.name ?? row.teams?.name ?? "—",
    teamLogo: applyLogo(row.teams?.clubs?.logo_url, logoMap),
    opponentName: row.opponent_club?.name ?? row.opponent_name,
    opponentLogo: applyLogo(row.opponent_club?.logo_url, logoMap) ?? row.opponent_logo_url ?? null,
    teamScore: row.team_score,
    opponentScore: row.opponent_score,
  }));
  const played = matches.filter((m) => m.teamScore != null && m.opponentScore != null);
  const results = played.slice(0, 4);
  const fixtures = matches
    .filter((m) => m.teamScore == null && m.opponentScore == null && m.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  // Last five results per registered team (matches are already newest-first).
  const formByTeam = new Map<string, { name: string; logo: string | null; form: FormResult[] }>();
  for (const m of played) {
    const entry = formByTeam.get(m.teamId) ?? { name: m.teamName, logo: m.teamLogo, form: [] };
    if (entry.form.length < 5) {
      entry.form.push(m.teamScore! > m.opponentScore! ? "W" : m.teamScore === m.opponentScore ? "D" : "L");
    }
    formByTeam.set(m.teamId, entry);
  }
  const form = [...formByTeam.entries()].slice(0, 4).map(([teamId, entry]) => ({ teamId, ...entry }));

  const tables = new Map<string, NonNullable<typeof standingRows.data>>();
  for (const row of standingRows.data ?? []) {
    tables.set(row.league, [...(tables.get(row.league) ?? []), row]);
  }
  const standings = [...tables.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 2)
    .map(([league, rows]) => ({
      league,
      rows: rows.slice(0, 5).map((row) => ({
        position: row.position,
        name: row.team_name,
        logo: row.team_logo_url,
        played: row.played,
        goalDiff: row.goals_for - row.goals_against,
        points: row.points,
      })),
    }));

  const perPlayer = new Map<
    string,
    { id: string; name: string; photo: string | null; team: string; goals: number; ratingTotal: number; rated: number }
  >();
  for (const row of statRows.data ?? []) {
    const entry = perPlayer.get(row.player_id) ?? {
      id: row.player_id,
      name: row.players?.full_name ?? "Unknown player",
      photo: row.players?.photo_url ?? null,
      team: row.teams?.clubs?.name ?? row.teams?.name ?? "",
      goals: 0,
      ratingTotal: 0,
      rated: 0,
    };
    entry.goals += row.goals;
    if (row.average_rating != null && row.rated_matches > 0) {
      entry.ratingTotal += row.average_rating * row.rated_matches;
      entry.rated += row.rated_matches;
    }
    perPlayer.set(row.player_id, entry);
  }
  const everyone = [...perPlayer.values()];
  const topScorers = everyone
    .filter((p) => p.goals > 0)
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 5)
    .map((p) => ({ id: p.id, name: p.name, photo: p.photo, team: p.team, value: p.goals }));
  const bestRated = everyone
    .filter((p) => p.rated > 0)
    .map((p) => ({ id: p.id, name: p.name, photo: p.photo, team: p.team, value: p.ratingTotal / p.rated }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const crests = (crestRows.data ?? [])
    .map((club) => ({ id: club.id, name: club.name, logo: applyLogo(club.logo_url, logoMap) }))
    .filter((club): club is { id: string; name: string; logo: string } => !!club.logo);

  return {
    playerCount: players.count ?? 0,
    clubCount: clubs.count ?? 0,
    teamCount: teams.count ?? 0,
    latestPlayers: (latest.data ?? []).map((p) => ({
      ...p,
      clubs: p.clubs ? { name: p.clubs.name, logo_url: applyLogo(p.clubs.logo_url, logoMap) } : null,
    })),
    fixtures,
    results,
    form,
    standings,
    topScorers,
    bestRated,
    crests,
  };
});
