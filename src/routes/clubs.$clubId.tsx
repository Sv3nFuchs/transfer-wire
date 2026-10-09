import { InjuryBadge } from "@/components/InjuryBadge";
import { MessageButton } from "@/components/MessageButton";
import { FollowButton } from "@/components/FollowButton";
import { jsonLd } from "@/lib/seo";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { clubQuery } from "@/lib/queries";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { ClubLogo } from "@/components/ClubLogo";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/clubs/$clubId")({
  loader: async ({ context, params }) => {
    const result = await context.queryClient.ensureQueryData(clubQuery(params.clubId));
    if (!result) throw notFound();
    return {
      name: result.club.name,
      city: result.club.city,
      level: result.club.level,
      country: result.club.country,
      logo: result.club.logo_url,
      founded: result.club.founded_year,
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Club not found — TransferWire" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.name} — club profile | TransferWire`;
    const description = `Teams, squads and players at ${loaderData.name}${loaderData.city ? ` (${loaderData.city})` : ""}${loaderData.level ? `, ${loaderData.level}` : ""}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        ...(loaderData.logo ? [{ property: "og:image", content: loaderData.logo }] : []),
      ],
      scripts: [
        jsonLd({
          "@type": "SportsTeam",
          name: loaderData.name,
          sport: "Soccer",
          ...(loaderData.logo ? { logo: loaderData.logo } : {}),
          ...(loaderData.founded ? { foundingDate: String(loaderData.founded) } : {}),
          ...(loaderData.city || loaderData.country
            ? {
                location: {
                  "@type": "Place",
                  address: {
                    "@type": "PostalAddress",
                    ...(loaderData.city ? { addressLocality: loaderData.city } : {}),
                    ...(loaderData.country ? { addressCountry: loaderData.country } : {}),
                  },
                },
              }
            : {}),
        }),
      ],
    };
  },
  component: ClubPage,
  errorComponent: ({ error }) => (
    <div role="alert" className="p-10 text-center text-sm text-muted-foreground">
      {error.message}
    </div>
  ),
  notFoundComponent: ClubNotFound,
});

function ClubNotFound() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h1 className="text-4xl">{t("club.notFound")}</h1>
        <Link to="/clubs" className="mt-4 inline-block text-primary underline">
          {t("club.backToClubs")}
        </Link>
      </div>
    </div>
  );
}

function ClubPage() {
  const { clubId } = Route.useParams();
  const { data } = useSuspenseQuery(clubQuery(clubId));
  const { isAdmin } = useIsAdmin();
  const { t } = useLanguage();
  if (!data) return <ClubNotFound />;
  const { club, players, pastPlayersByTeam } = data;
  const unassigned = players.filter((player) => !player.team_id);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="border-b border-border bg-pitch text-pitch-foreground pitch-stripes stripes-drift">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="flex items-center gap-5">
            <ClubLogo name={club.name} url={club.logo_url} className="size-20 sm:size-24" />
            <div>
              <p className="label-caps text-accent">{t("club.kicker")}</p>
              <h1 className="mt-2 text-5xl sm:text-6xl">
                <span className="inline-block" style={{ viewTransitionName: `club-${club.id}` }}>
                  {club.name}
                </span>
              </h1>
            </div>
          </div>
          <p className="mt-3 opacity-85">
            {[club.city, club.country, club.level, club.founded_year && `${t("club.founded")} ${club.founded_year}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {club.description ? (
            <p className="mt-4 max-w-2xl text-sm opacity-80">{club.description}</p>
          ) : null}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <FollowButton type="club" id={clubId} />
            <MessageButton ownerId={club.created_by} subjectType="club" subjectId={clubId} />
            {isAdmin ? (
              <Link
                to="/clubs/$clubId/edit"
                params={{ clubId }}
                className="inline-block rounded border border-pitch-foreground/40 px-3 py-1 font-display tracking-wide hover:bg-pitch-foreground/10"
              >
                {t("club.edit")}
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-3xl">{t("club.teamsAndSquads")}</h2>
        {club.teams.length === 0 && unassigned.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {t("club.noTeams")}
          </p>
        ) : null}
        <div className="mt-6 space-y-8">
          {club.teams.map((team) => {
            const squad = players.filter((player) => player.team_id === team.id);
            const squadIds = new Set(squad.map((player) => player.id));
            const pastPlayers = (pastPlayersByTeam[team.id] ?? []).filter((player) => !squadIds.has(player.id));
            return (
              <section
                key={team.id}
                className="overflow-hidden rounded-lg border border-border bg-card shadow-card"
              >
                <header className="flex flex-wrap items-baseline gap-3 border-b border-border bg-secondary px-5 py-3">
                  <h3 className="text-2xl leading-none">{team.name}</h3>
                  <p className="label-caps">
                    {[team.age_group, team.league, team.season].filter(Boolean).join(" · ")}
                  </p>
                </header>
                <Squad squad={squad} />
                {pastPlayers.length > 0 ? (
                  <div className="border-t border-border">
                    <p className="label-caps px-5 pt-4 text-muted-foreground">{t("club.pastPlayers")}</p>
                    <Squad squad={pastPlayers} />
                  </div>
                ) : null}
              </section>
            );
          })}
          {unassigned.length > 0 && (
            <section className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
              <header className="border-b border-border bg-secondary px-5 py-3">
                <h3 className="text-2xl leading-none">{t("club.otherPlayers")}</h3>
              </header>
              <Squad squad={unassigned} />
            </section>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

type SquadPlayer = {
  id: string;
  full_name: string;
  position: string | null;
  birth_year: number | null;
  shirt_number: number | null;
  nationality: string | null;
  injury_status?: string | null;
};

function Squad({ squad }: { squad: SquadPlayer[] }) {
  const { t } = useLanguage();
  if (squad.length === 0) {
    return <p className="px-5 py-6 text-sm text-muted-foreground">{t("club.emptySquad")}</p>;
  }
  return (
    <ul className="divide-y divide-border">
      {squad.map((player) => (
        <li key={player.id}>
          <Link
            to="/players/$playerId"
            params={{ playerId: player.id }}
            className="flex items-center gap-4 px-5 py-3 hover:bg-muted/60"
          >
            <span className="w-8 font-display text-xl text-accent">
              {player.shirt_number ?? "–"}
            </span>
            <span className="font-display text-lg">{player.full_name}</span>
            <InjuryBadge status={player.injury_status} />
            <span className="ml-auto text-sm text-muted-foreground">
              {[player.position, player.birth_year, player.nationality].filter(Boolean).join(" · ")}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
