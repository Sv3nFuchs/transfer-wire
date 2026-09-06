import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { leagueStatsQuery, leaguesQuery } from "@/lib/queries";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { useLanguage } from "@/lib/i18n";

type SearchParams = { league?: string };

export const Route = createFileRoute("/statistics/")({
  head: () => ({
    meta: [
      { title: "Statistics — Grassroots Football Hub" },
      {
        name: "description",
        content: "League standings, top scorers, and top average player ratings for grassroots football.",
      },
      { property: "og:title", content: "Statistics — Grassroots Football Hub" },
      {
        property: "og:description",
        content: "League standings, top scorers, and top average player ratings for grassroots football.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    const result: SearchParams = {};
    if (typeof search["league"] === "string" && search["league"]) result.league = search["league"];
    return result;
  },
  loaderDeps: ({ search }) => ({ league: search.league }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(leaguesQuery());
    if (deps.league) await context.queryClient.ensureQueryData(leagueStatsQuery(deps.league));
  },
  component: StatisticsPage,
});

function StatisticsPage() {
  const { league } = Route.useSearch();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data: leagues } = useSuspenseQuery(leaguesQuery());

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-4xl">{t("stats.title")}</h1>

        <div className="mt-6">
          {leagues.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("matches.noLeagues")}</p>
          ) : (
            <>
              <select
                value={league ?? ""}
                onChange={(event) =>
                  navigate({
                    to: "/statistics",
                    search: event.target.value ? { league: event.target.value } : {},
                    replace: true,
                  })
                }
                className="h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">{t("matches.selectLeague")}</option>
                {leagues.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              {league ? <LeagueStats league={league} /> : null}
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function LeagueStats({ league }: { league: string }) {
  const { t } = useLanguage();
  const { data, isPending } = useQuery(leagueStatsQuery(league));

  if (isPending || !data) {
    return <p className="mt-6 text-sm text-muted-foreground">…</p>;
  }

  const hasAnything = data.standings.some((s) => s.played > 0) || data.topScorers.length > 0 || data.topRatings.length > 0;
  if (!hasAnything) {
    return <p className="mt-6 text-sm text-muted-foreground">{t("matches.noStatsYet")}</p>;
  }

  return (
    <div className="mt-6 space-y-10">
      <section>
        <h2 className="text-2xl">{t("matches.standings")}</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-card shadow-card">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-secondary text-secondary-foreground">
              <tr>
                <th className="px-3 py-2 text-left label-caps">{t("matches.thTeam")}</th>
                <th className="px-3 py-2 text-right label-caps">{t("matches.thPlayed")}</th>
                <th className="px-3 py-2 text-right label-caps">{t("matches.thWon")}</th>
                <th className="px-3 py-2 text-right label-caps">{t("matches.thDrawn")}</th>
                <th className="px-3 py-2 text-right label-caps">{t("matches.thLost")}</th>
                <th className="px-3 py-2 text-right label-caps">{t("matches.thGF")}</th>
                <th className="px-3 py-2 text-right label-caps">{t("matches.thGA")}</th>
                <th className="px-3 py-2 text-right label-caps">{t("matches.thGD")}</th>
                <th className="px-3 py-2 text-right label-caps">{t("matches.thPts")}</th>
              </tr>
            </thead>
            <tbody>
              {data.standings.map((row) => (
                <tr key={row.teamId} className="border-t border-border">
                  <td className="px-3 py-2">
                    {row.clubName ? `${row.clubName} — ` : ""}
                    {row.name}
                  </td>
                  <td className="px-3 py-2 text-right">{row.played}</td>
                  <td className="px-3 py-2 text-right">{row.won}</td>
                  <td className="px-3 py-2 text-right">{row.drawn}</td>
                  <td className="px-3 py-2 text-right">{row.lost}</td>
                  <td className="px-3 py-2 text-right">{row.goalsFor}</td>
                  <td className="px-3 py-2 text-right">{row.goalsAgainst}</td>
                  <td className="px-3 py-2 text-right">{row.goalsFor - row.goalsAgainst}</td>
                  <td className="px-3 py-2 text-right font-display text-accent">{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-8 sm:grid-cols-2">
        <section>
          <h2 className="text-2xl">{t("matches.topScorers")}</h2>
          <ol className="mt-3 divide-y divide-border rounded-lg border border-border bg-card shadow-card">
            {data.topScorers.map((row, i) => (
              <li key={row.playerId} className="flex items-center gap-3 px-4 py-3">
                <span className="w-6 text-sm text-muted-foreground">{i + 1}</span>
                <span className="font-display text-lg">{row.name}</span>
                <span className="ml-auto font-display text-xl text-accent">{row.goals}</span>
              </li>
            ))}
          </ol>
        </section>
        <section>
          <h2 className="text-2xl">{t("matches.topRatings")}</h2>
          <ol className="mt-3 divide-y divide-border rounded-lg border border-border bg-card shadow-card">
            {data.topRatings.map((row, i) => (
              <li key={row.playerId} className="flex items-center gap-3 px-4 py-3">
                <span className="w-6 text-sm text-muted-foreground">{i + 1}</span>
                <span className="font-display text-lg">{row.name}</span>
                <span className="ml-auto font-display text-xl text-accent">{row.average.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">({row.count})</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
