import { createServerFn } from "@tanstack/react-start";
import { createPublicClient } from "./public-client.server";
import { resolveLogoUrls, applyLogo } from "./logo-urls.server";

export const listMatches = createServerFn({ method: "GET" })
  .inputValidator((input: { teamId?: string; limit?: number } | undefined) => input ?? {})
  .handler(async ({ data }) => {
    const supabase = createPublicClient();
    let query = supabase
      .from("matches")
      .select(
        "id, match_date, home_away, team_score, opponent_score, opponent_name, opponent_club_id, opponent_logo_url, team_id, teams(id, name, league, clubs(id, name, logo_url)), opponent_club:clubs!matches_opponent_club_id_fkey(id, name, logo_url)",
      )
      .order("match_date", { ascending: false })
      .limit(data.limit ?? 100);
    if (data.teamId) query = query.eq("team_id", data.teamId);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const logoMap = await resolveLogoUrls(
      (rows ?? []).flatMap((row) => [row.teams?.clubs?.logo_url, row.opponent_club?.logo_url]),
    );
    return (rows ?? []).map((row) => ({
      ...row,
      teams: row.teams
        ? { ...row.teams, clubs: row.teams.clubs ? { ...row.teams.clubs, logo_url: applyLogo(row.teams.clubs.logo_url, logoMap) } : null }
        : null,
      opponent_club: row.opponent_club
        ? { ...row.opponent_club, logo_url: applyLogo(row.opponent_club.logo_url, logoMap) }
        : null,
    }));
  });

export type MatchListItem = Awaited<ReturnType<typeof listMatches>>[number];

export const getMatch = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const supabase = createPublicClient();
    const { data: match, error } = await supabase
      .from("matches")
      .select(
        "*, teams(id, name, league, age_group, clubs(id, name, logo_url)), opponent_club:clubs!matches_opponent_club_id_fkey(id, name, logo_url)",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!match) return null;
    const { data: ratings, error: ratingsError } = await supabase
      .from("match_player_ratings")
      .select("id, rating, goals_scored, players(id, full_name, shirt_number, position)")
      .eq("match_id", data.id)
      .order("rating", { ascending: false, nullsFirst: false });
    if (ratingsError) throw new Error(ratingsError.message);
    const logoMap = await resolveLogoUrls([match.teams?.clubs?.logo_url, match.opponent_club?.logo_url]);
    return {
      ...match,
      teams: match.teams
        ? { ...match.teams, clubs: match.teams.clubs ? { ...match.teams.clubs, logo_url: applyLogo(match.teams.clubs.logo_url, logoMap) } : null }
        : null,
      opponent_club: match.opponent_club
        ? { ...match.opponent_club, logo_url: applyLogo(match.opponent_club.logo_url, logoMap) }
        : null,
      ratings: ratings ?? [],
    };
  });

export const listLeagues = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createPublicClient();
  const { data, error } = await supabase.from("teams").select("league").not("league", "is", null);
  if (error) throw new Error(error.message);
  const leagues = [...new Set((data ?? []).map((row) => row.league).filter((v): v is string => !!v?.trim()))];
  return leagues.sort((a, b) => a.localeCompare(b));
});

type StandingRow = {
  teamId: string;
  name: string;
  clubName: string | null;
  logoUrl?: string | null;
  position?: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
};

export const getLeagueStats = createServerFn({ method: "GET" })
  .inputValidator((input: { league: string }) => input)
  .handler(async ({ data }) => {
    const supabase = createPublicClient();

    // Prefer the official table imported from Everysport (every team in the
    // division, not just ones registered here) over one computed from our own
    // teams' matches.
    const { data: officialStandings, error: officialError } = await supabase
      .from("league_standings")
      .select("*")
      .eq("league", data.league)
      .order("position", { ascending: true });
    if (officialError) throw new Error(officialError.message);
    const standingsFromImport: StandingRow[] | null =
      officialStandings && officialStandings.length > 0
        ? officialStandings.map((row) => ({
            teamId: row.everysport_team_id,
            name: row.team_name,
            clubName: null,
            logoUrl: row.team_logo_url,
            position: row.position,
            played: row.played,
            won: row.won,
            drawn: row.drawn,
            lost: row.lost,
            goalsFor: row.goals_for,
            goalsAgainst: row.goals_against,
            points: row.points,
          }))
        : null;

    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("id, name, clubs(name)")
      .eq("league", data.league);
    if (teamsError) throw new Error(teamsError.message);
    const teamIds = (teams ?? []).map((team) => team.id);
    if (teamIds.length === 0 && !standingsFromImport) {
      return { standings: [], topScorers: [], topRatings: [] };
    }

    const { data: matches, error: matchesError } =
      teamIds.length === 0
        ? { data: [], error: null }
        : await supabase.from("matches").select("id, team_id, team_score, opponent_score").in("team_id", teamIds);
    if (matchesError) throw new Error(matchesError.message);

    const standingsByTeam = new Map<string, StandingRow>();
    for (const team of teams ?? []) {
      standingsByTeam.set(team.id, {
        teamId: team.id,
        name: team.name,
        clubName: team.clubs?.name ?? null,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
      });
    }
    for (const match of matches ?? []) {
      if (match.team_score == null || match.opponent_score == null) continue;
      const row = standingsByTeam.get(match.team_id);
      if (!row) continue;
      row.played += 1;
      row.goalsFor += match.team_score;
      row.goalsAgainst += match.opponent_score;
      if (match.team_score > match.opponent_score) {
        row.won += 1;
        row.points += 3;
      } else if (match.team_score === match.opponent_score) {
        row.drawn += 1;
        row.points += 1;
      } else {
        row.lost += 1;
      }
    }
    const standings =
      standingsFromImport ??
      [...standingsByTeam.values()]
        .sort((a, b) => b.points - a.points || b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst))
        .map((row, i) => ({ ...row, position: i + 1 }));

    // Sourced from the precomputed player_season_stats table (kept in sync by a
    // trigger on match_player_ratings) rather than re-scanning raw ratings here.
    const { data: seasonStats, error: statsError } = await supabase
      .from("player_season_stats")
      .select("player_id, goals, matches_played, rated_matches, average_rating, players(full_name)")
      .eq("league", data.league);
    if (statsError) throw new Error(statsError.message);

    const scorers = new Map<string, { playerId: string; name: string; goals: number }>();
    const ratingAgg = new Map<string, { playerId: string; name: string; weightedTotal: number; count: number }>();
    for (const row of seasonStats ?? []) {
      const name = row.players?.full_name ?? "Unknown player";
      if (row.goals > 0) {
        const existing = scorers.get(row.player_id) ?? { playerId: row.player_id, name, goals: 0 };
        existing.goals += row.goals;
        scorers.set(row.player_id, existing);
      }
      if (row.average_rating != null && row.rated_matches > 0) {
        const existing = ratingAgg.get(row.player_id) ?? { playerId: row.player_id, name, weightedTotal: 0, count: 0 };
        existing.weightedTotal += row.average_rating * row.rated_matches;
        existing.count += row.rated_matches;
        ratingAgg.set(row.player_id, existing);
      }
    }
    const topScorers = [...scorers.values()].sort((a, b) => b.goals - a.goals).slice(0, 20);
    const topRatings = [...ratingAgg.values()]
      .map((row) => ({ playerId: row.playerId, name: row.name, average: row.weightedTotal / row.count, count: row.count }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 20);

    return { standings, topScorers, topRatings };
  });
