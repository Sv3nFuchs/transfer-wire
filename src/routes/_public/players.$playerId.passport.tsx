import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { playerQuery } from "@/lib/queries";
import { ClubLogo } from "@/components/ClubLogo";
import { PlayerPhoto } from "@/components/PlayerPhoto";
import { CountryFlag } from "@/components/CountryFlag";
import { PlayerFlags } from "@/components/PlayerFlags";
import { formatDateInLang, useLanguage } from "@/lib/i18n";
import { calculateAge } from "@/lib/age";
import { isIndexablePlayer } from "@/lib/seo";
import { Play, Printer } from "lucide-react";
import type { ReactNode } from "react";

export const Route = createFileRoute("/_public/players/$playerId/passport")({
  loader: async ({ context, params }) => {
    const player = await context.queryClient.ensureQueryData(playerQuery(params.playerId));
    if (!player) throw notFound();
    return { name: player.full_name, indexable: isIndexablePlayer(player.birth_year) };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Player not found — TransferWire" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.name} — Player Passport | TransferWire`;
    return { meta: [{ title }, ...(loaderData.indexable ? [] : [{ name: "robots", content: "noindex" }])] };
  },
  component: PassportPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <p>Player not found.</p>
    </div>
  ),
});

function Stat({ label, value, valueClassName = "" }: { label: string; value: ReactNode; valueClassName?: string }) {
  return (
    <div className="text-center">
      <p className={`font-display text-3xl ${valueClassName}`}>{value}</p>
      <p className="label-caps mt-1 text-muted-foreground">{label}</p>
    </div>
  );
}

function PassportPage() {
  const { playerId } = Route.useParams();
  const { data: player } = useSuspenseQuery(playerQuery(playerId));
  const { t } = useLanguage();
  if (!player) return null;

  const totalApps = player.season_stats.reduce((sum, row) => sum + row.matches_played, 0);
  const totalGoals = player.season_stats.reduce((sum, row) => sum + row.goals, 0);
  let weightedTotal = 0;
  let ratedCount = 0;
  for (const row of player.season_stats) {
    if (row.average_rating != null && row.rated_matches > 0) {
      weightedTotal += row.average_rating * row.rated_matches;
      ratedCount += row.rated_matches;
    }
  }
  const avgRating = ratedCount > 0 ? weightedTotal / ratedCount : null;
  const age = player.birth_date ? calculateAge(player.birth_date, new Date().toISOString().slice(0, 10)) : null;

  // Every distinct club from club-type transfers, excluding the current one
  // (already shown in the header) — mirrors how Schools Played For is built.
  const previousClubsByKey = new Map<string, { id: string; name: string; logoUrl: string | null }>();
  for (const transfer of player.transfers) {
    if ((transfer.org_type ?? "club") !== "club") continue;
    const to = transfer.to_club
      ? { id: transfer.to_club.id, name: transfer.to_club.name, logoUrl: transfer.to_club.logo_url }
      : transfer.to_club_name
        ? { id: transfer.to_club_name, name: transfer.to_club_name, logoUrl: null }
        : null;
    if (to && !previousClubsByKey.has(to.id)) previousClubsByKey.set(to.id, to);
    const from = transfer.from_club
      ? { id: transfer.from_club.id, name: transfer.from_club.name, logoUrl: transfer.from_club.logo_url }
      : transfer.from_club_name
        ? { id: transfer.from_club_name, name: transfer.from_club_name, logoUrl: null }
        : null;
    if (from && !previousClubsByKey.has(from.id)) previousClubsByKey.set(from.id, from);
  }
  if (player.clubs) previousClubsByKey.delete(player.clubs.id);
  const previousClubs = [...previousClubsByKey.values()];

  return (
    <div className="min-h-screen bg-background">
      <div className="print:hidden">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <Link to="/players/$playerId" params={{ playerId }} className="text-sm text-primary underline">
            ← {t("player.backToProfile")}
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded bg-accent px-3 py-1.5 font-display text-sm tracking-wide text-accent-foreground hover:opacity-90"
          >
            <Printer className="size-4" aria-hidden="true" />
            {t("player.printPassport")}
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-2xl px-4 pb-16">
        <div className="rounded-lg border border-border bg-card p-8 shadow-card print:border-0 print:shadow-none">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-border pb-6">
            <div className="flex items-start gap-4">
              <PlayerPhoto name={player.full_name} url={player.photo_url} className="h-28 w-[5.5rem]" />
              <div>
                <p className="label-caps text-accent">{t("player.kicker")}</p>
                <h1 className="mt-1 text-4xl">
                  {player.shirt_number ? <span className="mr-2 text-accent">{player.shirt_number}</span> : null}
                  {player.full_name}
                  <PlayerFlags flags={[player.flag_1, player.flag_2]} className="ml-2 align-middle" />
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {[player.position, player.nationality, age != null ? `${age} ${t("player.yearsOld")}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>
            {player.clubs ? (
              <div className="flex items-center gap-3">
                <ClubLogo name={player.clubs.name} url={player.clubs.logo_url} className="size-12" />
                <div>
                  <p className="font-display text-base leading-tight">{player.clubs.name}</p>
                  {player.teams ? <p className="text-sm text-muted-foreground">{player.teams.name}</p> : null}
                </div>
              </div>
            ) : null}
          </header>

          <section className="mt-6 grid grid-cols-3 gap-4 border-b-2 border-border pb-6">
            <Stat label={t("player.statApps")} value={totalApps} />
            <Stat label={t("player.statGoals")} value={totalGoals} />
            <Stat
              label={t("player.statAvgRating")}
              value={avgRating != null ? avgRating.toFixed(1) : "—"}
              valueClassName={avgRating != null && avgRating >= 7 ? "text-green-600" : "text-accent"}
            />
          </section>

          {player.bio ? (
            <section className="mt-6 border-b-2 border-border pb-6">
              <h2 className="label-caps text-muted-foreground">{t("player.about")}</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{player.bio}</p>
            </section>
          ) : null}

          {player.season_stats.length > 0 ? (
            <section className="mt-6 border-b-2 border-border pb-6">
              <h2 className="label-caps text-muted-foreground">{t("player.seasonStats")}</h2>
              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-1 font-normal">{t("player.statSeason")}</th>
                    <th className="py-1 font-normal">{t("player.statTeam")}</th>
                    <th className="py-1 text-right font-normal">{t("player.statApps")}</th>
                    <th className="py-1 text-right font-normal">{t("player.statGoals")}</th>
                    <th className="py-1 text-right font-normal">{t("player.statAvgRating")}</th>
                  </tr>
                </thead>
                <tbody>
                  {player.season_stats.map((row, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="py-1.5">{row.season ?? "—"}</td>
                      <td className="py-1.5">
                        {row.teams?.clubs?.name ? `${row.teams.clubs.name} — ` : ""}
                        {row.teams?.name ?? "—"}
                      </td>
                      <td className="py-1.5 text-right">{row.matches_played}</td>
                      <td className="py-1.5 text-right">{row.goals}</td>
                      <td className="py-1.5 text-right">{row.average_rating != null ? row.average_rating.toFixed(1) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}

          {previousClubs.length > 0 ? (
            <section className="mt-6 border-b-2 border-border pb-6">
              <h2 className="label-caps text-muted-foreground">{t("player.previousClubs")}</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {previousClubs.map((club) => (
                  <li key={club.id} className="flex items-center gap-2">
                    <ClubLogo name={club.name} url={club.logoUrl} className="size-5" />
                    {club.name}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {player.schools.length > 0 ? (
            <section className="mt-6 border-b-2 border-border pb-6">
              <h2 className="label-caps text-muted-foreground">{t("player.schoolsPlayedFor")}</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {player.schools.map((school) => (
                  <li key={school.id} className="flex items-center gap-2">
                    <ClubLogo name={school.name} url={school.logoUrl} className="size-5" />
                    {school.name}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <h2 className="label-caps text-muted-foreground">{t("player.birthplace")}</h2>
              <p className="mt-1 flex items-center gap-2 text-sm">
                {player.birthplace ?? "—"}
                <CountryFlag code={player.birthplace_country_code} />
              </p>
            </div>
            <div>
              <h2 className="label-caps text-muted-foreground">{t("player.height")}</h2>
              <p className="mt-1 text-sm">{player.height_cm ? `${player.height_cm} cm` : "—"}</p>
            </div>
          </section>

          {player.highlight_video_url ? (
            <section className="mt-6 border-t-2 border-border pt-6 print:hidden">
              <a
                href={player.highlight_video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded bg-accent px-3 py-1.5 font-display text-sm tracking-wide text-accent-foreground hover:opacity-90"
              >
                <Play className="size-4" aria-hidden="true" />
                {t("player.watchHighlights")}
              </a>
            </section>
          ) : null}

          <footer className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground">
            {t("player.passportFooter")} {formatDateInLang(new Date().toISOString().slice(0, 10), "")}
            {player.highlight_video_url ? <span className="hidden print:inline"> · {player.highlight_video_url}</span> : null}
          </footer>
        </div>
      </main>
    </div>
  );
}
