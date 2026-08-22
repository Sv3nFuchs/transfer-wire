import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { playerQuery } from "@/lib/queries";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { PlayerFlags } from "@/components/PlayerFlags";


export const Route = createFileRoute("/players/$playerId")({
  loader: async ({ context, params }) => {
    const player = await context.queryClient.ensureQueryData(playerQuery(params.playerId));
    if (!player) throw notFound();
    return { name: player.full_name, position: player.position, club: player.clubs?.name };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Spelaren hittades inte — Gräsrot FC Data" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.name} — spelarprofil | Gräsrot FC Data`;
    const description = `Spelarprofil för ${loaderData.name}${loaderData.club ? ` i ${loaderData.club}` : ""}${loaderData.position ? `, position ${loaderData.position}` : ""}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: PlayerPage,
  errorComponent: ({ error }) => (
    <div role="alert" className="p-10 text-center text-sm text-muted-foreground">
      {error.message}
    </div>
  ),
  notFoundComponent: PlayerNotFound,
});

function PlayerNotFound() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h1 className="text-4xl">Spelaren finns inte</h1>
        <Link to="/players" className="mt-4 inline-block text-primary underline">
          Tillbaka till spelare
        </Link>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="border-t border-border py-3">
      <p className="label-caps">{label}</p>
      <p className="font-display text-2xl leading-tight">{value ?? "—"}</p>
    </div>
  );
}

function PlayerPage() {
  const { playerId } = Route.useParams();
  const { data: player } = useSuspenseQuery(playerQuery(playerId));
  const { isAdmin } = useIsAdmin();
  if (!player) return <PlayerNotFound />;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="border-b border-border bg-pitch text-pitch-foreground pitch-stripes">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <p className="label-caps text-accent">Spelarprofil</p>
          <h1 className="mt-2 text-5xl sm:text-6xl">
            {player.shirt_number ? (
              <span className="mr-3 text-accent">{player.shirt_number}</span>
            ) : null}
            {player.full_name}
            <PlayerFlags flags={[player.flag_1, player.flag_2]} className="ml-3 align-middle text-4xl" />
          </h1>
          <p className="mt-3 opacity-85">
            {[player.position, player.nationality, player.birth_year && `Född ${player.birth_year}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {player.clubs ? (
              <Link
                to="/clubs/$clubId"
                params={{ clubId: player.clubs.id }}
                className="inline-block rounded bg-accent px-3 py-1 font-display tracking-wide text-accent-foreground"
              >
                {player.clubs.name}
                {player.teams ? ` — ${player.teams.name}` : ""}
              </Link>
            ) : null}
            {isAdmin ? (
              <Link
                to="/players/$playerId/edit"
                params={{ playerId }}
                className="inline-block rounded border border-pitch-foreground/40 px-3 py-1 font-display tracking-wide hover:bg-pitch-foreground/10"
              >
                Redigera
              </Link>
            ) : null}
          </div>
        </div>
      </section>


      <main className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[2fr_1fr]">
        <div>
          <h2 className="text-2xl">Om spelaren</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {player.bio || "Ingen beskrivning har lagts in för den här spelaren ännu."}
          </p>

          <h2 className="mt-10 text-2xl">Övergångar</h2>
          {player.transfers.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Inga övergångar är registrerade för den här spelaren ännu.
            </p>
          ) : (
            <ol className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card shadow-card">
              {player.transfers.map((transfer) => (
                <li key={transfer.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-4">
                  <span className="label-caps w-24 text-muted-foreground">
                    {formatTransferDate(transfer.transfer_date)}
                  </span>
                  <span className="font-display text-lg">
                    {transfer.from_club?.name ?? transfer.from_club_name ?? "Okänd klubb"}
                  </span>
                  <span className="text-accent">→</span>
                  <span className="font-display text-lg">
                    {transfer.to_club?.name ?? transfer.to_club_name ?? "Okänd klubb"}
                  </span>
                  {transfer.transfer_type ? (
                    <span className="rounded bg-secondary px-2 py-0.5 text-xs uppercase tracking-wide">
                      {transfer.transfer_type}
                    </span>
                  ) : null}
                  {transfer.note ? (
                    <span className="w-full text-sm text-muted-foreground">{transfer.note}</span>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </div>
        <aside className="rounded-lg border border-border bg-card p-5 shadow-card">
          <h2 className="text-xl">Fakta</h2>
          <Fact label="Position" value={player.position} />
          <Fact label="Födelseår" value={player.birth_year} />
          <Fact label="Starkaste fot" value={player.preferred_foot} />
          <Fact label="Längd" value={player.height_cm ? `${player.height_cm} cm` : null} />
          <Fact label="Nationalitet" value={player.nationality} />
          <Fact label="Lag" value={player.teams?.name} />
          <Fact label="Åldersgrupp" value={player.teams?.age_group} />
        </aside>
      </main>
      <SiteFooter />
    </div>
  );
}
