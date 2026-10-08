import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { clubsQuery } from "@/lib/queries";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { Input } from "@/components/ui/input";
import { ClubLogo } from "@/components/ClubLogo";
import { ImportClubsPanel } from "@/components/ImportClubsPanel";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/clubs/")({
  head: () => ({
    meta: [
      { title: "Clubs — TransferWire" },
      {
        name: "description",
        content:
          "All registered clubs with teams, level and city — from Swedish division 7 to Sunday League.",
      },
      { property: "og:title", content: "Clubs — TransferWire" },
      {
        property: "og:description",
        content: "Browse clubs, their teams and squads.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { q?: string | undefined } => ({
    q: (search["q"] as string) || undefined,
  }),
  loaderDeps: ({ search: { q } }) => ({ q: q ?? "" }),
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(clubsQuery(deps.q)),
  component: ClubsPage,
  errorComponent: ({ error }) => (
    <div role="alert" className="p-10 text-center text-sm text-muted-foreground">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-10 text-center">No clubs found.</div>,
});

function ClubsPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const { data: clubs } = useSuspenseQuery(clubsQuery(q ?? ""));
  const { t } = useLanguage();
  const { isAdmin } = useIsAdmin();

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-4xl">{t("clubs.title")}</h1>
        {isAdmin ? <ImportClubsPanel /> : null}
        <Input
          value={q ?? ""}
          placeholder={t("clubs.searchPlaceholder")}
          className="mt-6 max-w-sm"
          onChange={(event) =>
            navigate({ to: "/clubs", search: { q: event.target.value }, replace: true })
          }
        />
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
