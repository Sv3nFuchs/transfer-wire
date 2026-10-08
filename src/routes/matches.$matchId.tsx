import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { matchQuery } from "@/lib/queries";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { ClubLogo } from "@/components/ClubLogo";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { formatDateInLang, useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/matches/$matchId")({
  loader: async ({ context, params }) => {
    const match = await context.queryClient.ensureQueryData(matchQuery(params.matchId));
    if (!match) throw notFound();
    return {
      clubName: match.teams?.clubs?.name ?? match.teams?.name ?? null,
      opponentName: match.opponent_club?.name ?? match.opponent_name,
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Match not found — TransferWire" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.clubName ?? "Match"} vs ${loaderData.opponentName} | TransferWire`;
    return { meta: [{ title }, { property: "og:title", content: title }] };
  },
  component: MatchPage,
  errorComponent: ({ error }) => (
    <div role="alert" className="p-10 text-center text-sm text-muted-foreground">
      {error.message}
    </div>
  ),
  notFoundComponent: MatchNotFound,
});

function MatchNotFound() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h1 className="text-4xl">{t("matches.notFound")}</h1>
        <Link to="/matches" className="mt-4 inline-block text-primary underline">
          {t("matches.backToMatches")}
        </Link>
      </div>
    </div>
  );
}

function MatchPage() {
  const { matchId } = Route.useParams();
  const { data: match } = useSuspenseQuery(matchQuery(matchId));
  const { isAdmin } = useIsAdmin();
  const { t } = useLanguage();
  if (!match) return <MatchNotFound />;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="border-b border-border bg-pitch text-pitch-foreground pitch-stripes stripes-drift">
        <div className="mx-auto max-w-4xl px-4 py-14">
          <p className="label-caps text-accent">
            {formatDateInLang(match.match_date, "—")}
            {match.teams?.league ? ` · ${match.teams.league}` : ""}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-center sm:justify-between">
            <div className="flex flex-1 flex-col items-center gap-2 sm:flex-row sm:justify-end">
              <span className="font-display text-2xl sm:order-2">{match.teams?.clubs?.name ?? match.teams?.name}</span>
              <ClubLogo name={match.teams?.clubs?.name ?? match.teams?.name ?? "?"} url={match.teams?.clubs?.logo_url ?? null} className="size-14 sm:order-1" />
            </div>
            <span className="font-display text-4xl text-accent">
              {match.team_score ?? "–"} : {match.opponent_score ?? "–"}
            </span>
            <div className="flex flex-1 flex-col items-center gap-2 sm:flex-row">
              <ClubLogo
                name={match.opponent_club?.name ?? match.opponent_name}
                url={match.opponent_club?.logo_url ?? match.opponent_logo_url}
                className="size-14"
              />
              <span className="font-display text-2xl">{match.opponent_club?.name ?? match.opponent_name}</span>
            </div>
          </div>
          {match.team_score == null || match.opponent_score == null ? (
            <p className="mt-4 text-center text-sm opacity-75">{t("matches.notPlayedYet")}</p>
          ) : null}
          {isAdmin ? (
            <div className="mt-5 text-center">
              <Link
                to="/matches/$matchId/edit"
                params={{ matchId }}
                className="inline-block rounded border border-pitch-foreground/40 px-3 py-1 font-display tracking-wide hover:bg-pitch-foreground/10"
              >
                {t("matches.edit")}
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      <main className="mx-auto max-w-4xl px-4 py-12">
        <h2 className="text-2xl">{t("matches.lineupRatings")}</h2>
        {match.ratings.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("matches.noRatingsYet")}</p>
        ) : (
          <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-card shadow-card">
            {match.ratings.map((entry) => (
              <li key={entry.id} className="flex items-center gap-4 px-5 py-3">
                <span className="w-8 font-display text-xl text-accent">{entry.players?.shirt_number ?? "–"}</span>
                <span className="font-display text-lg">{entry.players?.full_name}</span>
                <span className="text-sm text-muted-foreground">{entry.players?.position}</span>
                {entry.goals_scored > 0 ? (
                  <span className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                    ⚽ {entry.goals_scored}
                  </span>
                ) : null}
                <span
                  className={`ml-auto rounded px-2 py-1 font-display text-lg ${
                    entry.rating != null && entry.rating >= 7
                      ? "bg-green-600 text-white"
                      : "bg-accent text-accent-foreground"
                  }`}
                >
                  {entry.rating != null ? entry.rating.toFixed(1) : "–"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
