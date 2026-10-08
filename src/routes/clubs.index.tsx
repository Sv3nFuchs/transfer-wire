import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { clubFiltersQuery, clubsQuery } from "@/lib/queries";
import { CLUB_LIST_LIMIT } from "@/lib/grassroots.functions";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { Input } from "@/components/ui/input";
import { ClubLogo } from "@/components/ClubLogo";
import { ImportClubsPanel } from "@/components/ImportClubsPanel";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useLanguage } from "@/lib/i18n";

type ClubSearch = { q?: string; country?: string; league?: string };

export const Route = createFileRoute("/clubs/")({
  head: () => ({
    meta: [
      { title: "Clubs — TransferWire" },
      {
        name: "description",
        content:
          "All registered clubs with teams, level and city — from academies and school teams to Sunday League, anywhere in the world.",
      },
      { property: "og:title", content: "Clubs — TransferWire" },
      {
        property: "og:description",
        content: "Browse clubs, their teams and squads.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): ClubSearch => {
    const result: ClubSearch = {};
    if (typeof search["q"] === "string" && search["q"]) result.q = search["q"];
    if (typeof search["country"] === "string" && search["country"]) result.country = search["country"];
    if (typeof search["league"] === "string" && search["league"]) result.league = search["league"];
    return result;
  },
  loaderDeps: ({ search: { q, country, league } }) => ({ q: q ?? "", country, league }),
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(clubsQuery(deps.q, deps.country, deps.league)),
      context.queryClient.ensureQueryData(clubFiltersQuery(deps.country)),
    ]);
  },
  component: ClubsPage,
  errorComponent: ({ error }) => (
    <div role="alert" className="p-10 text-center text-sm text-muted-foreground">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-10 text-center">No clubs found.</div>,
});

function ClubsPage() {
  const { q, country, league } = Route.useSearch();
  const navigate = useNavigate();
  const { data: clubs } = useSuspenseQuery(clubsQuery(q ?? "", country, league));
  const { data: filters } = useSuspenseQuery(clubFiltersQuery(country));
  const { t } = useLanguage();
  const { isAdmin } = useIsAdmin();
  const selectClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-auto sm:max-w-[16rem]";

  // Only include the filters that are set (exactOptionalPropertyTypes).
  const go = (next: { q?: string | undefined; country?: string | undefined; league?: string | undefined }) =>
    navigate({
      to: "/clubs",
      search: {
        ...(next.q ? { q: next.q } : {}),
        ...(next.country ? { country: next.country } : {}),
        ...(next.league ? { league: next.league } : {}),
      },
      replace: true,
    });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-4xl">{t("clubs.title")}</h1>
        {isAdmin ? <ImportClubsPanel /> : null}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Input
            value={q ?? ""}
            placeholder={t("clubs.searchPlaceholder")}
            className="sm:max-w-xs"
            onChange={(event) => go({ q: event.target.value, country, league })}
          />
          <select
            aria-label={t("clubs.countryLabel")}
            value={country ?? ""}
            onChange={(event) => go({ q, country: event.target.value || undefined })}
            className={selectClass}
          >
            <option value="">{t("clubs.allCountries")}</option>
            {filters.countries.map((c) => (
              <option key={c.country} value={c.country}>
                {c.country} ({c.count})
              </option>
            ))}
          </select>
          <select
            aria-label={t("clubs.leagueLabel")}
            value={league ?? ""}
            onChange={(event) => go({ q, country, league: event.target.value || undefined })}
            className={selectClass}
          >
            <option value="">{t("clubs.allLeagues")}</option>
            {filters.leagues.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          {q || country || league ? (
            <button
              type="button"
              onClick={() => go({})}
              className="text-sm text-primary underline sm:ml-1"
            >
              {t("clubs.clearFilters")}
            </button>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {clubs.length} {t("clubs.showing")}
          {clubs.length >= CLUB_LIST_LIMIT ? ` · ${t("clubs.limitHint")}` : ""}
        </p>
        {clubs.length === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground">{t("clubs.noMatch")}</p>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clubs.map((club) => (
              <li key={club.id} className="reveal">
                <Link
                  to="/clubs/$clubId"
                  params={{ clubId: club.id }}
                  className="flex h-full flex-col rounded-lg border border-border bg-card p-5 shadow-card lift"
                >
                  <span className="flex items-center gap-3">
                    <ClubLogo name={club.name} url={club.logo_url} className="size-12" />
                    <span className="font-display text-2xl leading-tight" style={{ viewTransitionName: `club-${club.id}` }}>
                      {club.name}
                    </span>
                  </span>
                  <span className="mt-2 text-sm text-muted-foreground">
                    {[club.city, club.country].filter(Boolean).join(", ")}
                  </span>
                  <span className="mt-4 flex gap-4 text-sm">
                    <span className="rounded bg-secondary px-2 py-0.5 text-secondary-foreground">
                      {club.level ?? t("clubs.levelUnknown")}
                    </span>
                  </span>
                  <span className="mt-4 border-t border-border pt-3 label-caps">
                    {club.team_count} {t("clubs.teams")} · {club.player_count} {t("clubs.players")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
