import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { clubQuery } from "@/lib/queries";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export const Route = createFileRoute("/clubs/$clubId")({
  loader: async ({ context, params }) => {
    const result = await context.queryClient.ensureQueryData(clubQuery(params.clubId));
    if (!result) throw notFound();
    return { name: result.club.name, city: result.club.city, level: result.club.level };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Klubben hittades inte — Gräsrot FC Data" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.name} — klubbprofil | Gräsrot FC Data`;
    const description = `Lag, trupper och spelare i ${loaderData.name}${loaderData.city ? ` (${loaderData.city})` : ""}${loaderData.level ? `, ${loaderData.level}` : ""}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
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
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h1 className="text-4xl">Klubben finns inte</h1>
        <Link to="/clubs" className="mt-4 inline-block text-primary underline">
          Tillbaka till klubbar
        </Link>
      </div>
    </div>
  );
}

function ClubPage() {
  const { clubId } = Route.useParams();
  const { data } = useSuspenseQuery(clubQuery(clubId));
  if (!data) return <ClubNotFound />;
  const { club, players } = data;
  const unassigned = players.filter((player) => !player.team_id);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="border-b border-border bg-pitch text-pitch-foreground pitch-stripes">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <p className="label-caps text-accent">Klubb</p>
          <h1 className="mt-2 text-5xl sm:text-6xl">{club.name}</h1>
          <p className="mt-3 opacity-85">
            {[club.city, club.country, club.level, club.founded_year && `Grundad ${club.founded_year}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {club.description ? (
            <p className="mt-4 max-w-2xl text-sm opacity-80">{club.description}</p>
          ) : null}
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-3xl">Lag & trupper</h2>
        {club.teams.length === 0 && unassigned.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Inga lag är registrerade för den här klubben ännu.
          </p>
        ) : null}
        <div className="mt-6 space-y-8">
          {club.teams.map((team) => {
            const squad = players.filter((player) => player.team_id === team.id);
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
              </section>
            );
          })}
          {unassigned.length > 0 && (
            <section className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
              <header className="border-b border-border bg-secondary px-5 py-3">
                <h3 className="text-2xl leading-none">Övriga spelare i klubben</h3>
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
};

function Squad({ squad }: { squad: SquadPlayer[] }) {
  if (squad.length === 0) {
    return <p className="px-5 py-6 text-sm text-muted-foreground">Truppen är tom.</p>;
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
            <span className="ml-auto text-sm text-muted-foreground">
              {[player.position, player.birth_year, player.nationality].filter(Boolean).join(" · ")}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
