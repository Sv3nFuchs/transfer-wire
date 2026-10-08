import { Link } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import { ClubLogo } from "@/components/ClubLogo";
import { PlayerPhoto } from "@/components/PlayerPhoto";
import { formatDateInLang, useLanguage } from "@/lib/i18n";
import type { FormResult, getOverview } from "@/lib/grassroots.functions";

type Overview = Awaited<ReturnType<typeof getOverview>>;
type MatchItem = Overview["results"][number];

/** Line drawing of a pitch that draws itself in, with a ball working a passing move. */
export function PitchArt() {
  return (
    <svg
      viewBox="0 0 300 200"
      aria-hidden="true"
      className="pitch-art pointer-events-none absolute right-4 top-1/2 hidden w-[340px] -translate-y-1/2 text-pitch-foreground xl:block"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <g opacity="0.4">
        <rect className="pitch-line" pathLength="1" x="10" y="10" width="280" height="180" rx="2" />
        <path className="pitch-line" pathLength="1" d="M150 10V190" />
        <circle className="pitch-line" pathLength="1" cx="150" cy="100" r="26" />
        <rect className="pitch-line" pathLength="1" x="10" y="52" width="44" height="96" />
        <rect className="pitch-line" pathLength="1" x="246" y="52" width="44" height="96" />
        <rect className="pitch-line" pathLength="1" x="10" y="78" width="18" height="44" />
        <rect className="pitch-line" pathLength="1" x="272" y="78" width="18" height="44" />
      </g>
      <polyline className="pass-line" points="60,140 120,70 190,125 250,92" stroke="var(--accent)" strokeWidth="2" />
      <circle className="pitch-ball" cx="0" cy="0" r="5" fill="var(--accent)" stroke="none" />
    </svg>
  );
}

/** Slow, endless strip of club crests; pauses on hover. */
export function CrestStrip({ crests }: { crests: Overview["crests"] }) {
  if (crests.length < 6) return null;
  const loop = [...crests, ...crests];
  return (
    <div className="marquee overflow-hidden border-b border-border bg-card py-4" aria-hidden="true">
      <div className="marquee-track gap-10 px-5">
        {loop.map((club, index) => (
          <Link
            key={`${club.id}-${index}`}
            to="/clubs/$clubId"
            params={{ clubId: club.id }}
            tabIndex={-1}
            title={club.name}
            className="shrink-0 opacity-70 grayscale transition duration-300 hover:scale-110 hover:opacity-100 hover:grayscale-0"
          >
            <ClubLogo name={club.name} url={club.logo} className="size-10" />
          </Link>
        ))}
      </div>
    </div>
  );
}

function FixtureRow({ match }: { match: MatchItem }) {
  const played = match.teamScore != null && match.opponentScore != null;
  return (
    <Link
      to="/matches/$matchId"
      params={{ matchId: match.id }}
      className="lift grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-card"
    >
      <span className="flex min-w-0 items-center justify-end gap-2 text-right">
        <span className="break-words font-display text-base leading-tight sm:truncate sm:text-lg">{match.teamName}</span>
        <ClubLogo name={match.teamName} url={match.teamLogo} className="size-8" />
      </span>
      <span className="grid min-w-16 justify-items-center">
        <span className="font-display text-xl text-accent tabular-nums">
          {played ? `${match.teamScore} : ${match.opponentScore}` : "vs"}
        </span>
        <span className="label-caps text-[0.7rem]">{formatDateInLang(match.date, "—")}</span>
      </span>
      <span className="flex min-w-0 items-center gap-2">
        <ClubLogo name={match.opponentName} url={match.opponentLogo} className="size-8" />
        <span className="break-words font-display text-base leading-tight sm:truncate sm:text-lg">{match.opponentName}</span>
      </span>
    </Link>
  );
}

const FORM_STYLE: Record<FormResult, string> = {
  W: "bg-primary text-primary-foreground",
  D: "bg-muted-foreground/60 text-card",
  L: "bg-destructive text-destructive-foreground",
};

export function FormGuide({ form }: { form: Overview["form"] }) {
  const { t } = useLanguage();
  if (form.length === 0) return null;
  return (
    <div className="mt-8">
      <h3 className="text-xl">{t("home.form")}</h3>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {form.map((team) => (
          <li key={team.teamId} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
            <ClubLogo name={team.name} url={team.logo} className="size-8" />
            <span className="min-w-0 flex-1 truncate font-display text-lg">{team.name}</span>
            <span className="flex gap-1">
              {[...team.form].reverse().map((result, index) => (
                <span
                  key={index}
                  style={{ "--i": index } as CSSProperties}
                  className={`enter grid size-6 place-items-center rounded-full font-display text-sm ${FORM_STYLE[result]}`}
                >
                  {result}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FixturesAndResults({ overview }: { overview: Overview }) {
  const { t } = useLanguage();
  const columns = [
    { title: t("home.fixtures"), empty: t("home.noFixtures"), items: overview.fixtures },
    { title: t("home.results"), empty: t("home.noResults"), items: overview.results },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 pt-16">
      <div className="grid gap-10 lg:grid-cols-2">
        {columns.map((column) => (
          <div key={column.title} className="reveal">
            <h2 className="text-3xl">{column.title}</h2>
            {column.items.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">{column.empty}</p>
            ) : (
              <div className="mt-6 grid gap-3">
                {column.items.map((match) => (
                  <FixtureRow key={match.id} match={match} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <FormGuide form={overview.form} />
      <Link to="/matches" className="mt-6 inline-block text-sm text-primary underline">
        {t("home.allMatches")}
      </Link>
    </section>
  );
}

export function MiniTables({ standings }: { standings: Overview["standings"] }) {
  const { t } = useLanguage();
  if (standings.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 pt-16">
      <h2 className="text-3xl">{t("home.tables")}</h2>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {standings.map((table) => (
          <div key={table.league} className="reveal overflow-hidden rounded-lg border border-border bg-card shadow-card">
            <p className="label-caps border-b border-border bg-secondary/60 px-4 py-2">{table.league}</p>
            <ol>
              {table.rows.map((row) => (
                <li
                  key={row.position}
                  className="grid grid-cols-[1.5rem_auto_1fr_2rem_2.5rem_2.5rem] items-center gap-3 border-t border-border px-4 py-2 text-sm first:border-t-0"
                >
                  <span className="font-display text-lg text-muted-foreground">{row.position}</span>
                  <ClubLogo name={row.name} url={row.logo} className="size-6" />
                  <span className="truncate font-display text-lg">{row.name}</span>
                  <span className="text-right text-muted-foreground tabular-nums">{row.played}</span>
                  <span className="text-right text-muted-foreground tabular-nums">
                    {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                  </span>
                  <span className="text-right font-display text-lg tabular-nums">{row.points}</span>
                </li>
              ))}
            </ol>
            <Link
              to="/matches"
              search={{ tab: "stats", league: table.league }}
              className="block border-t border-border px-4 py-2 text-sm text-primary underline"
            >
              {t("home.fullTable")}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

function LeaderList({
  title,
  rows,
  format,
}: {
  title: string;
  rows: Overview["topScorers"];
  format: (value: number) => string;
}) {
  return (
    <div className="reveal rounded-lg border border-border bg-card p-4 shadow-card">
      <h3 className="text-xl">{title}</h3>
      <ol className="mt-3 grid gap-2">
        {rows.map((row, index) => (
          <li key={row.id}>
            <Link
              to="/players/$playerId"
              params={{ playerId: row.id }}
              className="flex items-center gap-3 rounded-md p-1 transition-colors hover:bg-muted"
            >
              <span className="w-5 font-display text-lg text-muted-foreground">{index + 1}</span>
              <PlayerPhoto name={row.name} url={row.photo} className="h-10 w-8" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-lg leading-tight">{row.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{row.team}</span>
              </span>
              <span className="font-display text-2xl text-accent tabular-nums">{format(row.value)}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function Leaders({ topScorers, bestRated }: Pick<Overview, "topScorers" | "bestRated">) {
  const { t } = useLanguage();
  if (topScorers.length === 0 && bestRated.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 pt-16">
      <h2 className="text-3xl">{t("home.leaders")}</h2>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {topScorers.length > 0 ? (
          <LeaderList title={t("home.topScorers")} rows={topScorers} format={(v) => String(v)} />
        ) : null}
        {bestRated.length > 0 ? (
          <LeaderList title={t("home.bestRated")} rows={bestRated} format={(v) => v.toFixed(1)} />
        ) : null}
      </div>
    </section>
  );
}
