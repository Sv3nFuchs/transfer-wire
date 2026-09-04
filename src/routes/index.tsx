import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { overviewQuery } from "@/lib/queries";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gräsrot FC Data — spelardatabas för gräsrotsfotboll" },
      {
        name: "description",
        content:
          "Sök spelarprofiler, klubbar och lag i svensk division 5–7, amerikansk ungdomsfotboll och Sunday League. Bygg databasen tillsammans.",
      },
      { property: "og:title", content: "Gräsrot FC Data — spelardatabas för gräsrotsfotboll" },
      {
        property: "og:description",
        content: "Spelarprofiler och laglistor för fotboll på gräsrotsnivå i Sverige och USA.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(overviewQuery()),
  component: Index,
  errorComponent: ({ error }) => (
    <div role="alert" className="p-10 text-center text-sm text-muted-foreground">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-10 text-center">Hittades inte.</div>,
});

function Index() {
  const { data } = useSuspenseQuery(overviewQuery());
  const { t } = useLanguage();


  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="border-b border-border bg-pitch text-pitch-foreground pitch-stripes">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <p className="label-caps text-accent">{t("home.kicker")}</p>
          <h1 className="mt-3 max-w-3xl text-5xl leading-[0.95] sm:text-7xl">{t("home.title")}</h1>
          <p className="mt-5 max-w-xl text-base opacity-85">{t("home.lead")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="accent" size="lg">
              <Link to="/players">{t("home.ctaPlayers")}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-pitch-foreground/30 bg-transparent text-pitch-foreground hover:bg-pitch-foreground/10 hover:text-pitch-foreground"
            >
              <Link to="/clubs">Bläddra klubbar</Link>
            </Button>
          </div>
          <dl className="mt-14 grid max-w-2xl grid-cols-3 gap-6 border-t border-pitch-foreground/20 pt-6">
            {[
              ["Spelare", data.playerCount],
              ["Klubbar", data.clubCount],
              ["Lag", data.teamCount],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dd className="font-display text-4xl text-accent">{value as number}</dd>
                <dt className="label-caps text-pitch-foreground/70">{label as string}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl">Senast tillagda spelare</h2>
        {data.latestPlayers.length === 0 ? (
          <p className="mt-4 max-w-md text-sm text-muted-foreground">
            Databasen är tom. Logga in och bli först med att registrera en klubb och dess spelare.
          </p>
        ) : (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.latestPlayers.map((player) => (
              <li key={player.id}>
                <Link
                  to="/players/$playerId"
                  params={{ playerId: player.id }}
                  className="block rounded-lg border border-border bg-card p-4 shadow-card transition-shadow hover:shadow-lift"
                >
                  <p className="font-display text-2xl leading-tight">{player.full_name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[player.position, player.birth_year, player.clubs?.name]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
