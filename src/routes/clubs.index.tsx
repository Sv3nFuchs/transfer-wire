import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { clubsQuery } from "@/lib/queries";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/clubs/")({
  head: () => ({
    meta: [
      { title: "Klubbar — Gräsrot FC Data" },
      {
        name: "description",
        content:
          "Alla registrerade gräsrotsklubbar med lag, nivå och ort — från svensk division 7 till Sunday League.",
      },
      { property: "og:title", content: "Klubbar — Gräsrot FC Data" },
      {
        property: "og:description",
        content: "Bläddra bland gräsrotsklubbar, deras lag och trupper.",
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
  notFoundComponent: () => <div className="p-10 text-center">Inga klubbar hittades.</div>,
});

function ClubsPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const { data: clubs } = useSuspenseQuery(clubsQuery(q ?? ""));

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-4xl">Klubbar</h1>
        <Input
          value={q ?? ""}
          placeholder="Sök klubbnamn…"
          className="mt-6 max-w-sm"
          onChange={(event) =>
            navigate({ to: "/clubs", search: { q: event.target.value }, replace: true })
          }
        />
        {clubs.length === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground">Inga klubbar matchar sökningen.</p>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clubs.map((club) => (
              <li key={club.id}>
                <Link
                  to="/clubs/$clubId"
                  params={{ clubId: club.id }}
                  className="flex h-full flex-col rounded-lg border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-lift"
                >
                  <span className="font-display text-2xl leading-tight">{club.name}</span>
                  <span className="mt-1 text-sm text-muted-foreground">
                    {[club.city, club.country].filter(Boolean).join(", ")}
                  </span>
                  <span className="mt-4 flex gap-4 text-sm">
                    <span className="rounded bg-secondary px-2 py-0.5 text-secondary-foreground">
                      {club.level ?? "Nivå okänd"}
                    </span>
                  </span>
                  <span className="mt-4 border-t border-border pt-3 label-caps">
                    {club.team_count} lag · {club.player_count} spelare
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
