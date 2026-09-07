import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type EverysportTeamRef = { id: string; name: string };

type EverysportGame = {
  id: string;
  startDate: string;
  homeTeam: EverysportTeamRef;
  awayTeam: EverysportTeamRef;
  score: { homeTeam: number; awayTeam: number } | null;
  series: { name: string } | null;
};

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
      }
    | undefined;
  if (!props?.team?.id) {
    throw new Error("Could not find team data on the Everysport page.");
  }
  return {
    team: props.team,
    games: [...(props.games?.games ?? []), ...(props.gamesResult?.games ?? [])],
  };
}

export const syncEverysportFixtures = createServerFn({ method: "POST" })
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
    if (!adminRole) throw new Error("Only an admin can sync fixtures.");

    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id, everysport_url")
      .eq("id", data.teamId)
      .maybeSingle();
    if (teamError) throw new Error(teamError.message);
    if (!team?.everysport_url) throw new Error("This team has no Everysport URL set.");

    const res = await fetch(team.everysport_url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GrassrootsFootballHub/1.0)" },
    });
    if (!res.ok) throw new Error(`Everysport request failed: ${res.status} ${res.statusText}`);
    const { team: everysportTeam, games } = parseEverysportPage(await res.text());

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
          team_id: data.teamId,
          opponent_club_id: opponentClubId,
          opponent_name: opponent.name,
          match_date: matchDate,
          home_away: isHome ? "home" : "away",
          team_score: game.score ? (isHome ? game.score.homeTeam : game.score.awayTeam) : null,
          opponent_score: game.score ? (isHome ? game.score.awayTeam : game.score.homeTeam) : null,
          competition: game.series?.name ?? null,
          external_source: "everysport",
          external_id: game.id,
          created_by: userId,
        },
        { onConflict: "external_source,external_id" },
      );
      if (upsertError) throw new Error(`Could not save a match: ${upsertError.message}`);
      imported += 1;
    }

    return { imported };
  });
