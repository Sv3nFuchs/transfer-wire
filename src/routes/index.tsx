import { InjuryBadge } from "@/components/InjuryBadge";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { overviewQuery } from "@/lib/queries";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { Button } from "@/components/ui/button";
import { CountUp } from "@/components/CountUp";
import { PlayerPhoto } from "@/components/PlayerPhoto";
import { ClubLogo } from "@/components/ClubLogo";
import { CrestStrip, FixturesAndResults, Leaders, MiniTables, PitchArt } from "@/components/HomeSections";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TransferWire — player and team database" },
      {
        name: "description",
        content:
          "Search player profiles, clubs and teams from leagues, academies, schools and Sunday League teams around the world. Build the database together.",
      },
      { property: "og:title", content: "TransferWire — player and team database" },
      {
        property: "og:description",
        content: "Player profiles and team rosters for football all around the world.",
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
  notFoundComponent: () => <div className="p-10 text-center">Not found.</div>,
});

function Index() {
  const { data } = useSuspenseQuery(overviewQuery());
  const { t } = useLanguage();


  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="border-b border-border bg-pitch text-pitch-foreground pitch-stripes stripes-drift">
        <div className="relative mx-auto max-w-6xl px-4 py-20">
          <PitchArt />
          <p className="enter label-caps text-accent">{t("home.kicker")}</p>
          <h1 style={{ "--i": 1 } as React.CSSProperties} className="enter mt-3 max-w-3xl text-5xl leading-[0.95] sm:text-7xl">{t("home.title")}</h1>
          <p style={{ "--i": 2 } as React.CSSProperties} className="enter mt-5 max-w-xl text-base opacity-85">{t("home.lead")}</p>
          <div style={{ "--i": 3 } as React.CSSProperties} className="enter mt-8 flex flex-wrap gap-3">
            <Button asChild variant="accent" size="lg">
              <Link to="/players">{t("home.ctaPlayers")}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-pitch-foreground/30 bg-transparent text-pitch-foreground hover:bg-pitch-foreground/10 hover:text-pitch-foreground"
            >
              <Link to="/clubs">{t("home.ctaClubs")}</Link>
            </Button>
          </div>
          <dl style={{ "--i": 4 } as React.CSSProperties} className="enter mt-14 grid max-w-2xl grid-cols-3 gap-6 border-t border-pitch-foreground/20 pt-6">
            {[
              [t("home.statPlayers"), data.playerCount],
              [t("home.statClubs"), data.clubCount],
              [t("home.statTeams"), data.teamCount],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dd className="font-display text-4xl tabular-nums text-accent">
                  <CountUp value={value as number} />
                </dd>
                <dt className="label-caps text-pitch-foreground/70">{label as string}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <CrestStrip crests={data.crests} />
      <FixturesAndResults overview={data} />
      <div className="mt-16 border-y border-border bg-secondary/60 pb-16">
        <MiniTables standings={data.standings} />
        <Leaders topScorers={data.topScorers} bestRated={data.bestRated} />
      </div>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl">{t("home.latest")}</h2>
        {data.latestPlayers.length === 0 ? (
          <p className="mt-4 max-w-md text-sm text-muted-foreground">{t("home.empty")}</p>
        ) : (
          <ul className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {data.latestPlayers.map((player) => (
              <li key={player.id} className="reveal">
                <Link
                  to="/players/$playerId"
                  params={{ playerId: player.id }}
                  className="lift block overflow-hidden rounded-lg border border-border bg-card shadow-card"
                >
                  <div className="relative">
                    <PlayerPhoto name={player.full_name} url={player.photo_url} className="aspect-[4/5] w-full !rounded-none" />
                    <InjuryBadge status={player.injury_status} className="absolute right-2 top-2" />
                    {player.shirt_number ? (
                      <span className="absolute left-2 top-2 rounded bg-pitch px-1.5 font-display text-lg leading-6 text-accent">
                        {player.shirt_number}
                      </span>
                    ) : null}
                    {player.position ? (
                      <span className="absolute bottom-2 right-2 rounded bg-accent px-1.5 py-0.5 text-[0.7rem] font-medium text-accent-foreground">
                        {player.position.replace(/\(.*\)/, "").trim().split(" ").map((w) => w[0]).join("").slice(0, 3).toUpperCase()}
                      </span>
                    ) : null}
                  </div>
                  <div className="p-3">
                    <p className="font-display text-xl leading-tight">
                      <span className="inline-block" style={{ viewTransitionName: `player-${player.id}` }}>
                        {player.full_name}
                      </span>
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      {player.clubs ? <ClubLogo name={player.clubs.name} url={player.clubs.logo_url} className="size-4" /> : null}
                      <span className="truncate">{[player.birth_year, player.clubs?.name].filter(Boolean).join(" · ")}</span>
                    </p>
                  </div>
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
