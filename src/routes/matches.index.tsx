import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { leagueStatsQuery, leaguesQuery, matchesQuery } from "@/lib/queries";
import type { MatchListItem } from "@/lib/matches.functions";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { ClubLogo } from "@/components/ClubLogo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateInLang, useLanguage } from "@/lib/i18n";

type SearchParams = { tab?: "matches" | "stats"; league?: string };

export const Route = createFileRoute("/matches/")({
  head: () => ({
    meta: [
      { title: "Matches — Grassroots Football Hub" },
      {
        name: "description",
        content: "Follow match results and player ratings across grassroots clubs, plus league statistics.",
      },
      { property: "og:title", content: "Matches — Grassroots Football Hub" },
      {
        property: "og:description",
        content: "Match results, player ratings, and league statistics for grassroots football.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    const result: SearchParams = {};
    if (search["tab"] === "stats") result.tab = "stats";
    if (typeof search["league"] === "string" && search["league"]) result.league = search["league"];
    return result;
  },
  loaderDeps: ({ search }) => ({ league: search.league }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(matchesQuery());
    await context.queryClient.ensureQueryData(leaguesQuery());
    if (deps.league) await context.queryClient.ensureQueryData(leagueStatsQuery(deps.league));
  },
  component: MatchesPage,
});

function buildSearch(tab?: "matches" | "stats", league?: string): SearchParams {
  const result: SearchParams = {};
  if (tab && tab !== "matches") result.tab = tab;
  if (league) result.league = league;
  return result;
}

function MatchesPage() {
  const { tab, league } = Route.useSearch();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data: matches } = useSuspenseQuery(matchesQuery());
  const { data: leagues } = useSuspenseQuery(leaguesQuery());
  const activeTab = tab ?? "matches";

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-4xl">{t("matches.title")}</h1>

        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            navigate({ to: "/matches", search: buildSearch(value === "stats" ? "stats" : "matches", league), replace: true })
          }
          className="mt-6"
        >
          <TabsList>
            <TabsTrigger value="matches">{t("matches.tabMatches")}</TabsTrigger>
            <TabsTrigger value="stats">{t("matches.tabStats")}</TabsTrigger>
          </TabsList>

          <TabsContent value="matches" className="mt-6">
            {leagues.length > 0 ? (
              <select
                value={league ?? ""}
                onChange={(event) =>
                  navigate({
                    to: "/matches",
                    search: buildSearch("matches", event.target.value || undefined),
                    replace: true,
                  })
                }
                className="mb-6 h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">{t("matches.allLeagues")}</option>
                {leagues.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            ) : null}
            <MatchesList matches={matches} league={league} />
          </TabsContent>

          <TabsContent value="stats" className="mt-6">
            {leagues.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("matches.noLeagues")}</p>
            ) : (
              <>
                <select
                  value={league ?? ""}
                  onChange={(event) =>
                    navigate({
                      to: "/matches",
                      search: buildSearch("stats", event.target.value || undefined),
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
          </TabsContent>
        </Tabs>
      </main>
      <SiteFooter />
    </div>
  );
}

function MatchesList({ matches, league }: { matches: MatchListItem[]; league: string | undefined }) {
  const { t } = useLanguage();
  const filtered = league ? matches.filter((match) => match.teams?.league === league) : matches;
  const upcoming = filtered
    .filter((match) => match.team_score == null && match.opponent_score == null)
    .sort((a, b) => a.match_date.localeCompare(b.match_date));
  const past = filtered
    .filter((match) => match.team_score != null || match.opponent_score != null)
    .sort((a, b) => b.match_date.localeCompare(a.match_date));

  if (filtered.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("matches.noMatches")}</p>;
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-2xl">{t("matches.upcoming")}</h2>
        {upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("matches.noUpcoming")}</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {upcoming.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="text-2xl">{t("matches.results")}</h2>
        {past.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("matches.noResults")}</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {past.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function MatchCard({ match }: { match: MatchListItem }) {
  return (
    <li>
      <Link
        to="/matches/$matchId"
        params={{ matchId: match.id }}
        className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-card transition-shadow hover:shadow-lift"
      >
        <span className="w-24 shrink-0 text-xs text-muted-foreground">
          {formatDateInLang(match.match_date, "—")}
        </span>
        <ClubLogo name={match.teams?.clubs?.name ?? match.teams?.name ?? "?"} url={match.teams?.clubs?.logo_url ?? null} className="size-8" />
        <span className="font-display text-lg">{match.teams?.clubs?.name ?? match.teams?.name}</span>
        <span className="font-display text-xl text-accent">
          {match.team_score ?? "–"} : {match.opponent_score ?? "–"}
        </span>
        <span className="font-display text-lg">{match.opponent_club?.name ?? match.opponent_name}</span>
        {match.opponent_club ? (
          <ClubLogo name={match.opponent_club.name} url={match.opponent_club.logo_url} className="size-8" />
        ) : null}
        {match.teams?.league ? (
          <span className="ml-auto rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
            {match.teams.league}
          </span>
        ) : null}
      </Link>
    </li>
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
                    <span className="flex items-center gap-2">
                      {row.logoUrl ? <ClubLogo name={row.name} url={row.logoUrl} className="size-6" /> : null}
                      <span>
                        {row.clubName ? `${row.clubName} — ` : ""}
                        {row.name}
                      </span>
                    </span>
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
                <span className={`ml-auto font-display text-xl ${row.average >= 7 ? "text-green-600" : "text-accent"}`}>
                  {row.average.toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">({row.count})</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
