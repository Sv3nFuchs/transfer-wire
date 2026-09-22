import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { playerQuery } from "@/lib/queries";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { PlayerFlags } from "@/components/PlayerFlags";
import { formatDateInLang, useLanguage } from "@/lib/i18n";
import { ClubLogo } from "@/components/ClubLogo";
import { CountryFlag } from "@/components/CountryFlag";
import type { ReactNode } from "react";


export const Route = createFileRoute("/players/$playerId")({
  loader: async ({ context, params }) => {
    const player = await context.queryClient.ensureQueryData(playerQuery(params.playerId));
    if (!player) throw notFound();
    return { name: player.full_name, position: player.position, club: player.clubs?.name };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Player not found — TransferWire" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.name} — player profile | TransferWire`;
    const description = `Player profile for ${loaderData.name}${loaderData.club ? ` at ${loaderData.club}` : ""}${loaderData.position ? `, position ${loaderData.position}` : ""}.`;
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
  const { t } = useLanguage();
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h1 className="text-4xl">{t("player.notFound")}</h1>
        <Link to="/players" className="mt-4 inline-block text-primary underline">
          {t("player.backToPlayers")}
        </Link>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="border-t border-border py-3">
      <p className="label-caps">{label}</p>
      <div className="font-display text-2xl leading-tight">{value ?? "—"}</div>
    </div>
  );
}

type TransferRow = {
  id: string;
  transfer_date: string | null;
  transfer_type: string | null;
  note: string | null;
  org_type: string | null;
  from_club_name: string | null;
  to_club_name: string | null;
  from_club: { id: string; name: string; logo_url: string | null; country_code: string | null } | null;
  to_club: { id: string; name: string; logo_url: string | null; country_code: string | null } | null;
};

function TransferClub({
  name,
  logo,
  countryCode,
}: {
  name: string;
  logo: string | null;
  countryCode: string | null;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <ClubLogo name={name} url={logo} className="size-7" />
      <span className="font-display text-lg">{name}</span>
      <CountryFlag code={countryCode} />
    </span>
  );
}

function TransferSection({
  title,
  empty,
  transfers,
}: {
  title: string;
  empty: string;
  transfers: TransferRow[];
}) {
  const { t } = useLanguage();
  return (
    <section className="mt-10 border-t-2 border-border pt-8">
      <h2 className="text-2xl">{title}</h2>
      {transfers.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ol className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card shadow-card">
          {transfers.map((transfer) => (
            <li key={transfer.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-4">
              <span className="label-caps w-24 text-muted-foreground">
                {formatDateInLang(transfer.transfer_date, t("player.unknownDate"))}
              </span>
              <TransferClub
                name={transfer.from_club?.name ?? transfer.from_club_name ?? t("player.unknownClub")}
                logo={transfer.from_club?.logo_url ?? null}
                 countryCode={transfer.from_club?.country_code ?? null}
              />
              <span className="text-accent">→</span>
              <TransferClub
                name={transfer.to_club?.name ?? transfer.to_club_name ?? t("player.unknownClub")}
                logo={transfer.to_club?.logo_url ?? null}
                 countryCode={transfer.to_club?.country_code ?? null}
              />
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
    </section>
  );
}

type SeasonStatRow = {
  season: string | null;
  league: string | null;
  matches_played: number;
  goals: number;
  rated_matches: number;
  average_rating: number | null;
  teams: { name: string; clubs: { name: string } | null } | null;
};

function SeasonStats({ stats }: { stats: SeasonStatRow[] }) {
  const { t } = useLanguage();
  if (stats.length === 0) {
    return <p className="mt-3 text-sm text-muted-foreground">{t("player.noSeasonStats")}</p>;
  }
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-card shadow-card">
      <table className="w-full min-w-[520px] text-sm">
        <thead className="bg-secondary text-secondary-foreground">
          <tr>
            <th className="px-3 py-2 text-left label-caps">{t("player.statSeason")}</th>
            <th className="px-3 py-2 text-left label-caps">{t("player.statTeam")}</th>
            <th className="px-3 py-2 text-right label-caps">{t("player.statApps")}</th>
            <th className="px-3 py-2 text-right label-caps">{t("player.statGoals")}</th>
            <th className="px-3 py-2 text-right label-caps">{t("player.statAvgRating")}</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((row, i) => (
            <tr key={i} className="border-t border-border">
              <td className="px-3 py-2">{row.season ?? "—"}</td>
              <td className="px-3 py-2">
                {row.teams?.clubs?.name ? `${row.teams.clubs.name} — ` : ""}
                {row.teams?.name ?? "—"}
                {row.league ? <span className="ml-2 text-xs text-muted-foreground">({row.league})</span> : null}
              </td>
              <td className="px-3 py-2 text-right">{row.matches_played}</td>
              <td className="px-3 py-2 text-right">{row.goals}</td>
              <td className="px-3 py-2 text-right">
                {row.average_rating != null ? (
                  <span className={`font-display ${row.average_rating >= 7 ? "text-green-600" : "text-accent"}`}>
                    {row.average_rating.toFixed(1)}
                  </span>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type TeamMembershipRow = {
  id: string;
  teams: { name: string; season: string | null; league: string | null; clubs: { name: string } | null } | null;
};

function PastTeams({ memberships }: { memberships: TeamMembershipRow[] }) {
  const { t } = useLanguage();
  if (memberships.length === 0) {
    return <p className="mt-3 text-sm text-muted-foreground">{t("player.noPastTeams")}</p>;
  }
  return (
    <ul className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card shadow-card">
      {memberships.map((membership) => (
        <li key={membership.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
          {membership.teams?.season ? (
            <span className="label-caps w-16 text-muted-foreground">{membership.teams.season}</span>
          ) : null}
          <span className="font-display text-lg">
            {membership.teams?.clubs?.name ? `${membership.teams.clubs.name} — ` : ""}
            {membership.teams?.name ?? t("player.unknownClub")}
          </span>
          {membership.teams?.league ? (
            <span className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
              {membership.teams.league}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function PlayerPage() {
  const { playerId } = Route.useParams();
  const { data: player } = useSuspenseQuery(playerQuery(playerId));
  const { isAdmin } = useIsAdmin();
  const { t } = useLanguage();
  if (!player) return <PlayerNotFound />;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="border-b border-border bg-pitch text-pitch-foreground pitch-stripes">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <p className="label-caps text-accent">{t("player.kicker")}</p>
          <h1 className="mt-2 text-5xl sm:text-6xl">
            {player.shirt_number ? (
              <span className="mr-3 text-accent">{player.shirt_number}</span>
            ) : null}
            {player.full_name}
            <PlayerFlags flags={[player.flag_1, player.flag_2]} className="ml-3 align-middle" />
          </h1>
          <p className="mt-3 opacity-85">
            {[player.position, player.nationality, player.birth_year && `${t("player.bornPrefix")} ${player.birth_year}`]
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
                {t("player.edit")}
              </Link>
            ) : null}
          </div>
        </div>
      </section>


      <main className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[2fr_1fr]">
        <div>
          <h2 className="text-2xl">{t("player.about")}</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {player.bio || t("player.noBio")}
          </p>

          <section className="mt-10 border-t-2 border-border pt-8">
            <h2 className="text-2xl">{t("player.seasonStats")}</h2>
            <SeasonStats stats={player.season_stats} />
          </section>

          <TransferSection
            title={t("player.clubTransfers")}
            empty={t("player.noClubTransfers")}
            transfers={player.transfers.filter((transfer) => (transfer.org_type ?? "club") === "club")}
          />
          <TransferSection
            title={t("player.schoolSpells")}
            empty={t("player.noSchoolSpells")}
            transfers={player.transfers.filter((transfer) => transfer.org_type === "school")}
          />

          <TransferSection
            title={t("player.nationalSpells")}
            empty={t("player.noNationalSpells")}
            transfers={player.transfers.filter((transfer) => transfer.org_type === "national")}
          />

          <section className="mt-10 border-t-2 border-border pt-8">
            <h2 className="text-2xl">{t("player.pastTeams")}</h2>
            <PastTeams memberships={player.team_memberships} />
          </section>
        </div>
        <aside className="rounded-lg border border-border bg-card p-5 shadow-card">
          <h2 className="text-xl">{t("player.facts")}</h2>
          <Fact label={t("player.position")} value={player.position} />
          <Fact label={t("player.birthYear")} value={player.birth_year} />
           <Fact
             label={t("player.birthplace")}
             value={
               player.birthplace ? (
                 <span className="inline-flex items-center gap-2">
                   {player.birthplace}
                   <CountryFlag code={player.birthplace_country_code} className="h-5 w-[30px]" />
                 </span>
               ) : null
             }
           />
          <Fact label={t("player.foot")} value={player.preferred_foot} />
          <Fact label={t("player.height")} value={player.height_cm ? `${player.height_cm} cm` : null} />
          <Fact label={t("player.nationality")} value={player.nationality} />
          <Fact label={t("player.team")} value={player.teams?.name} />
          <Fact label={t("player.ageGroup")} value={player.teams?.age_group} />
        </aside>
      </main>
      <SiteFooter />
    </div>
  );
}
