import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type EverysportTeamRef = { id: string; name: string; logo?: string | null };

type EverysportGame = {
  id: string;
  startDate: string;
  homeTeam: EverysportTeamRef;
  awayTeam: EverysportTeamRef;
  score: { homeTeam: number; awayTeam: number } | null;
  series: { name: string } | null;
};

type EverysportStandingRow = {
  position: number;
  team: EverysportTeamRef;
  stats: { name: string; value: string }[];
};

function statValue(row: EverysportStandingRow, name: string): number {
  const stat = row.stats.find((s) => s.name === name);
  return stat ? Number(stat.value) || 0 : 0;
}

function parseEverysportPage(html: string) {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match?.[1]) {
    throw new Error("Could not find match data on the Everysport page — its layout may have changed.");
  }
  let json: unknown;
  try {
    json = JSON.parse(match[1]);
  } catch {
    throw new Error("Could not parse the Everysport page's data.");
  }
  const props = (json as { props?: { pageProps?: unknown } }).props?.pageProps as
    | {
        team?: EverysportTeamRef;
        games?: { games?: EverysportGame[] };
        gamesResult?: { games?: EverysportGame[] };
        standings?: { series?: { groups?: { standings?: EverysportStandingRow[] }[] }[] };
      }
    | undefined;
  if (!props?.team?.id) {
    throw new Error("Could not find team data on the Everysport page.");
  }
  const standings = (props.standings?.series?.[0]?.groups ?? []).flatMap((group) => group.standings ?? []);
  return {
    team: props.team,
    games: [...(props.games?.games ?? []), ...(props.gamesResult?.games ?? [])],
    standings,
  };
}

/**
 * Shared by the admin-triggered "Sync fixtures" button and the scheduled
 * fixtures:sync task. `userId` is only set for the interactive path — a
 * cron run omits `created_by` from the upsert entirely, rather than writing
 * null over rows an admin previously synced by hand.
 */
export async function syncTeamFixtures(
  supabase: SupabaseClient<Database>,
  team: { id: string; league: string | null; everysport_url: string | null },
  userId?: string,
) {
  if (!team.everysport_url) throw new Error("This team has no Everysport URL set.");

  const res = await fetch(team.everysport_url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; GrassrootsFootballHub/1.0)" },
  });
  if (!res.ok) throw new Error(`Everysport request failed: ${res.status} ${res.statusText}`);
  const { team: everysportTeam, games, standings } = parseEverysportPage(await res.text());

  let imported = 0;
  for (const game of games) {
    const matchDate = game.startDate?.slice(0, 10);
    if (!matchDate) continue;
    const isHome = game.homeTeam.id === everysportTeam.id;
    const opponent = isHome ? game.awayTeam : game.homeTeam;

    let opponentClubId: string | null = null;
    const { data: clubById } = await supabase
      .from("clubs")
      .select("id")
      .eq("everysport_id", opponent.id)
      .maybeSingle();
    if (clubById) {
      opponentClubId = clubById.id;
    } else {
      const { data: clubByName } = await supabase
        .from("clubs")
        .select("id")
        .ilike("name", opponent.name)
        .maybeSingle();
      if (clubByName) opponentClubId = clubByName.id;
    }

    const { error: upsertError } = await supabase.from("matches").upsert(
      {
        team_id: team.id,
        opponent_club_id: opponentClubId,
        opponent_name: opponent.name,
        opponent_logo_url: opponent.logo ?? null,
        match_date: matchDate,
        home_away: isHome ? "home" : "away",
        team_score: game.score ? (isHome ? game.score.homeTeam : game.score.awayTeam) : null,
        opponent_score: game.score ? (isHome ? game.score.awayTeam : game.score.homeTeam) : null,
        competition: game.series?.name ?? null,
        external_source: "everysport",
        external_id: game.id,
        ...(userId ? { created_by: userId } : {}),
      },
      { onConflict: "external_source,external_id" },
    );
    if (upsertError) throw new Error(`Could not save a match: ${upsertError.message}`);
    imported += 1;
  }

  let tableRows = 0;
  if (team.league && standings.length > 0) {
    const { error: deleteError } = await supabase.from("league_standings").delete().eq("league", team.league);
    if (deleteError) throw new Error(`Could not refresh the league table: ${deleteError.message}`);

    const rows = standings.map((row) => ({
      league: team.league!,
      position: row.position,
      team_name: row.team.name,
      team_logo_url: row.team.logo ?? null,
      everysport_team_id: row.team.id,
      played: statValue(row, "gp"),
      won: statValue(row, "w"),
      drawn: statValue(row, "d"),
      lost: statValue(row, "l"),
      goals_for: statValue(row, "gf"),
      goals_against: statValue(row, "ga"),
      points: statValue(row, "pts"),
    }));
    const { error: insertError } = await supabase.from("league_standings").insert(rows);
    if (insertError) throw new Error(`Could not save the league table: ${insertError.message}`);
    tableRows = rows.length;
  }

  return { imported, tableRows };
}
