import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { playersQuery } from "@/lib/queries";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/players/")({
  head: () => ({
    meta: [
      { title: "Players — TransferWire" },
      {
        name: "description",
        content:
          "Search player profiles: position, birth year, nationality, club and team.",
      },
      { property: "og:title", content: "Players — TransferWire" },
      {
        property: "og:description",
        content: "Search player profiles by name, club and team.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { q?: string | undefined } => ({
    q: (search["q"] as string) || undefined,
  }),
  loaderDeps: ({ search: { q } }) => ({ q: q ?? "" }),
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(playersQuery(deps.q)),
  component: PlayersPage,
  errorComponent: ({ error }) => (
    <div role="alert" className="p-10 text-center text-sm text-muted-foreground">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-10 text-center">No players found.</div>,
});

function PlayersPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const { data: players } = useSuspenseQuery(playersQuery(q ?? ""));
  const { t } = useLanguage();

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-4xl">{t("players.title")}</h1>
        <Input
          value={q ?? ""}
          placeholder={t("players.searchPlaceholder")}
          className="mt-6 max-w-sm"
          onChange={(event) =>
            navigate({ to: "/players", search: { q: event.target.value }, replace: true })
          }
        />

        <div className="mt-8 overflow-hidden rounded-lg border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-secondary-foreground">
              <tr>
                <th className="px-4 py-3 text-left label-caps text-secondary-foreground">{t("players.thPlayer")}</th>
                <th className="px-4 py-3 text-left label-caps text-secondary-foreground">{t("players.thPos")}</th>
                <th className="hidden px-4 py-3 text-left label-caps text-secondary-foreground sm:table-cell">
                  {t("players.thBorn")}
                </th>
                <th className="px-4 py-3 text-left label-caps text-secondary-foreground">{t("players.thClub")}</th>
                <th className="hidden px-4 py-3 text-left label-caps text-secondary-foreground md:table-cell">
                  {t("players.thTeam")}
                </th>
              </tr>
            </thead>
            <tbody>
              {players.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    {t("players.noMatch")}
                  </td>
                </tr>
              )}
              {players.map((player) => (
                <tr key={player.id} className="border-t border-border hover:bg-muted/60">
                  <td className="px-4 py-3">
                    <Link
                      to="/players/$playerId"
                      params={{ playerId: player.id }}
                      className="font-display text-lg hover:text-primary"
                    >
                      {player.shirt_number ? `${player.shirt_number}. ` : ""}
                      <span className="inline-block" style={{ viewTransitionName: `player-${player.id}` }}>
                        {player.full_name}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{player.position ?? "—"}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                    {player.birth_year ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {player.club_id ? (
                      <Link
                        to="/clubs/$clubId"
                        params={{ clubId: player.club_id }}
                        className="hover:text-primary"
                      >
                        {player.clubs?.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">{t("players.noClub")}</span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {player.teams?.name ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
