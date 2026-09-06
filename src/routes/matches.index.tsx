import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { matchesQuery } from "@/lib/queries";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { ClubLogo } from "@/components/ClubLogo";
import { formatDateInLang, useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/matches/")({
  head: () => ({
    meta: [
      { title: "Matches — Grassroots Football Hub" },
      {
        name: "description",
        content: "Follow match results and player ratings across grassroots clubs.",
      },
      { property: "og:title", content: "Matches — Grassroots Football Hub" },
      {
        property: "og:description",
        content: "Match results and player ratings for grassroots football.",
      },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(matchesQuery());
  },
  component: MatchesPage,
});

function MatchesPage() {
  const { t } = useLanguage();
  const { data: matches } = useSuspenseQuery(matchesQuery());

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-4xl">{t("matches.title")}</h1>

        <div className="mt-6">
          {matches.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("matches.noMatches")}</p>
          ) : (
            <ul className="space-y-3">
              {matches.map((match) => (
                <li key={match.id}>
                  <Link
                    to="/matches/$matchId"
                    params={{ matchId: match.id }}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-card transition-shadow hover:shadow-lift"
                  >
                    <span className="w-24 shrink-0 text-xs text-muted-foreground">
                      {formatDateInLang(match.match_date, "—")}
                    </span>
                    <ClubLogo name={match.teams?.clubs?.name ?? match.teams?.name ?? "?"} url={match.teams?.clubs?.logo_url ?? null} className="size-8" />
                    <span className="font-display text-lg">{match.teams?.name}</span>
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
              ))}
            </ul>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
