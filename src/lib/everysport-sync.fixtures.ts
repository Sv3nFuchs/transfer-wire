// Builds a page shaped like Everysport's Next.js team page, for the sync tests.
export const ME = { id: "100", name: "Test FC", logo: null };
export const OPPONENT = { id: "200", name: "Rival IF", logo: "https://example.com/rival.png" };

type Team = { id: string; name: string; logo?: string | null };

export function game(id: string, startDate: string, home: Team, away: Team, score: [number, number] | null) {
  return {
    id,
    startDate,
    homeTeam: home,
    awayTeam: away,
    score: score ? { homeTeam: score[0], awayTeam: score[1] } : null,
    series: { name: "Test League" },
  };
}

export function everysportPageHtml(options: {
  games: ReturnType<typeof game>[];
  table?: { team: Team; pts: number }[];
}) {
  const stat = (name: string, value: number) => ({ name, value: String(value) });
  const standings = (options.table ?? []).map((row, i) => ({
    position: i + 1,
    team: row.team,
    stats: [stat("gp", 3), stat("w", 3), stat("d", 0), stat("l", 0), stat("gf", 6), stat("ga", 1), stat("pts", row.pts)],
  }));
  const data = {
    props: {
      pageProps: {
        team: ME,
        games: { games: options.games },
        standings: { series: [{ groups: [{ standings }] }] },
      },
    },
  };
  return `<html><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script></body></html>`;
}
