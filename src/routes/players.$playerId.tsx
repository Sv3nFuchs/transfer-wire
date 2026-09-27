import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { playerQuery } from "@/lib/queries";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { PlayerFlags } from "@/components/PlayerFlags";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateInLang, useLanguage } from "@/lib/i18n";
import { ClubLogo } from "@/components/ClubLogo";
import { CountryFlag } from "@/components/CountryFlag";
import { UsStateFlag } from "@/components/UsStateFlag";
import { calculateAge, isBirthdayToday } from "@/lib/age";
import { getPositionCoords, getSecondaryPositionCoords, parsePosition } from "@/lib/pitch-position";
import { Cake, IdCard, Play, Shirt, Star } from "lucide-react";
import { SoccerBall } from "@/components/icons/SoccerBall";
import type { ReactNode } from "react";

type SearchParams = { tab?: "stats" | "transfers" | "career" };

export const Route = createFileRoute("/players/$playerId")({
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    const result: SearchParams = {};
    if (search["tab"] === "stats" || search["tab"] === "transfers" || search["tab"] === "career") {
      result.tab = search["tab"];
    }
    return result;
  },
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
    <div className="border-t border-border py-3 first:border-t-0">
      <p className="label-caps">{label}</p>
      <div className="font-display text-2xl leading-tight">{value ?? "—"}</div>
    </div>
  );
}

function PitchPosition({ position }: { position: string | null }) {
  const { t } = useLanguage();
  const coords = getPositionCoords(position);
  const secondaryCoords = getSecondaryPositionCoords(position);
  return (
    <div className="mt-4 max-w-xs rounded-lg border border-border bg-card p-5 shadow-card">
      <svg viewBox="0 0 100 100" className="w-full rounded bg-pitch pitch-stripes">
        <rect x="4" y="2" width="92" height="96" fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="0.6" />
        <line x1="4" y1="50" x2="96" y2="50" stroke="white" strokeOpacity="0.35" strokeWidth="0.6" />
        <circle cx="50" cy="50" r="9" fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="0.6" />
        <rect x="26" y="2" width="48" height="16" fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="0.6" />
        <rect x="38" y="2" width="24" height="7" fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="0.6" />
        <rect x="26" y="82" width="48" height="16" fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="0.6" />
        <rect x="38" y="91" width="24" height="7" fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="0.6" />
        {secondaryCoords ? (
          <circle
            cx={secondaryCoords.x}
            cy={secondaryCoords.y}
            r="2.8"
            className="fill-pitch-foreground"
            fillOpacity="0.75"
            stroke="white"
            strokeWidth="0.5"
          />
        ) : null}
        {coords ? (
          <circle cx={coords.x} cy={coords.y} r="4.5" className="fill-accent" stroke="white" strokeWidth="0.8" />
        ) : null}
      </svg>
      {!coords ? <p className="mt-3 text-xs text-muted-foreground">{t("player.noPositionMapped")}</p> : null}
    </div>
  );
}

type RecentFormRow = {
  id: string;
  matchId: string | null;
  date: string | null;
  rating: number | null;
  opponentName: string | null;
  opponentLogoUrl: string | null;
  competition: string | null;
  teamScore: number | null;
  opponentScore: number | null;
};

function RecentForm({ form }: { form: RecentFormRow[] }) {
  const { t } = useLanguage();

  let wins = 0;
  let draws = 0;
  let losses = 0;
  let ratingTotal = 0;
  let ratingCount = 0;
  for (const row of form) {
    if (row.teamScore != null && row.opponentScore != null) {
      if (row.teamScore > row.opponentScore) wins += 1;
      else if (row.teamScore < row.opponentScore) losses += 1;
      else draws += 1;
    }
    if (row.rating != null) {
      ratingTotal += row.rating;
      ratingCount += 1;
    }
  }
  const avgRating = ratingCount > 0 ? ratingTotal / ratingCount : null;

  return (
    <div className="mt-4 max-w-xs rounded-lg border border-border bg-card p-5 shadow-card">
      {form.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("player.noRecentForm")}</p>
      ) : (
        <>
          <ul className="divide-y divide-border">
            {form.map((row) => {
              const ratingClass = row.rating != null && row.rating >= 7 ? "text-green-600" : "text-accent";
              const resultLabel =
                row.teamScore != null && row.opponentScore != null ? `${row.teamScore}–${row.opponentScore}` : "—";
              const content = (
                <div className="flex items-center gap-3 py-2.5">
                  <ClubLogo name={row.opponentName ?? "?"} url={row.opponentLogoUrl} className="size-8" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm">{row.opponentName ?? t("player.unknownClub")}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.date ? formatDateInLang(row.date, "—") : "—"} · {resultLabel}
                      {row.competition ? ` · ${row.competition}` : ""}
                    </p>
                  </div>
                  <span className={`font-display text-lg ${ratingClass}`}>
                    {row.rating != null ? row.rating.toFixed(1) : "—"}
                  </span>
                </div>
              );
              return (
                <li key={row.id}>
                  {row.matchId ? (
                    <Link
                      to="/matches/$matchId"
                      params={{ matchId: row.matchId }}
                      className="-mx-1 block rounded px-1 hover:bg-muted/60"
                    >
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="label-caps text-muted-foreground">
              {wins}{t("player.formWinShort")} · {draws}{t("player.formDrawShort")} · {losses}{t("player.formLossShort")}
            </span>
            <span className="text-sm text-muted-foreground">
              {t("player.statAvgRating")}{" "}
              <span className={`font-display ${avgRating != null && avgRating >= 7 ? "text-green-600" : "text-accent"}`}>
                {avgRating != null ? avgRating.toFixed(1) : "—"}
              </span>
            </span>
          </div>
        </>
      )}
    </div>
  );
}

type TransferRow = {
  id: string;
  transfer_date: string | null;
  end_date: string | null;
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
    <section className="border-t-2 border-border pt-8 first:border-t-0 first:pt-0 [&:not(:first-child)]:mt-10">
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

function TrialsSection({ trials }: { trials: TransferRow[] }) {
  const { t } = useLanguage();
  return (
    <section className="border-t-2 border-border pt-8 first:border-t-0 first:pt-0 [&:not(:first-child)]:mt-10">
      <h2 className="text-2xl">{t("player.trials")}</h2>
      {trials.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("player.noTrials")}</p>
      ) : (
        <ol className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card shadow-card">
          {trials.map((trial) => {
            const period = trial.end_date
              ? `${formatDateInLang(trial.transfer_date, t("player.unknownDate"))} – ${formatDateInLang(trial.end_date, t("player.unknownDate"))}`
              : formatDateInLang(trial.transfer_date, t("player.unknownDate"));
            return (
              <li key={trial.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-4">
                <span className="label-caps w-40 shrink-0 text-muted-foreground">{period}</span>
                <TransferClub
                  name={trial.to_club?.name ?? trial.to_club_name ?? t("player.unknownClub")}
                  logo={trial.to_club?.logo_url ?? null}
                  countryCode={trial.to_club?.country_code ?? null}
                />
                {trial.note ? <span className="w-full text-sm text-muted-foreground">{trial.note}</span> : null}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function RecentTransferSection({ transfers, playerId }: { transfers: TransferRow[]; playerId: string }) {
  const { t } = useLanguage();
  const clubTransfers = transfers.filter((transfer) => (transfer.org_type ?? "club") === "club");
  // `transfers` arrives sorted most-recent-first.
  const mostRecent = clubTransfers.at(0);
  return (
    <section className="mt-10 border-t-2 border-border pt-8">
      <h2 className="text-2xl">{t("player.recentTransfer")}</h2>
      {mostRecent ? (
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-border bg-card p-5 shadow-card">
          <span className="label-caps w-24 text-muted-foreground">
            {formatDateInLang(mostRecent.transfer_date, t("player.unknownDate"))}
          </span>
          <TransferClub
            name={mostRecent.from_club?.name ?? mostRecent.from_club_name ?? t("player.unknownClub")}
            logo={mostRecent.from_club?.logo_url ?? null}
            countryCode={mostRecent.from_club?.country_code ?? null}
          />
          <span className="text-accent">→</span>
          <TransferClub
            name={mostRecent.to_club?.name ?? mostRecent.to_club_name ?? t("player.unknownClub")}
            logo={mostRecent.to_club?.logo_url ?? null}
            countryCode={mostRecent.to_club?.country_code ?? null}
          />
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{t("player.noClubTransfers")}</p>
      )}
      <Link
        to="/players/$playerId"
        params={{ playerId }}
        search={{ tab: "transfers" }}
        className="mt-3 inline-block text-sm text-primary underline"
      >
        {t("player.viewAllTransfers")}
      </Link>
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
    <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-card">
      <table className="w-full min-w-[520px] text-sm">
        <thead className="bg-secondary text-secondary-foreground">
          <tr>
            <th className="px-3 py-2 text-left label-caps">{t("player.statSeason")}</th>
            <th className="px-3 py-2 text-left label-caps">{t("player.statTeam")}</th>
            <th className="px-3 py-2 text-right label-caps">
              <span className="inline-flex items-center gap-1.5">
                <Shirt className="size-3.5" aria-hidden="true" />
                {t("player.statApps")}
              </span>
            </th>
            <th className="px-3 py-2 text-right label-caps">
              <span className="inline-flex items-center gap-1.5">
                <SoccerBall className="size-3.5" aria-hidden="true" />
                {t("player.statGoals")}
              </span>
            </th>
            <th className="px-3 py-2 text-right label-caps">
              <span className="inline-flex items-center gap-1.5">
                <Star className="size-3.5" aria-hidden="true" />
                {t("player.statAvgRating")}
              </span>
            </th>
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

type MatchLogRow = {
  id: string;
  rating: number | null;
  goals_scored: number;
  teams: { name: string; clubs: { name: string } | null } | null;
  matches: {
    id: string;
    match_date: string;
    opponent_name: string;
    competition: string | null;
    team_score: number | null;
    opponent_score: number | null;
    opponent_logo_url: string | null;
  } | null;
};

type MatchLogSeason = { season: string; matches: MatchLogRow[] };

function MatchResult({ teamScore, opponentScore }: { teamScore: number | null; opponentScore: number | null }) {
  if (teamScore == null || opponentScore == null) return <span className="text-muted-foreground">—</span>;
  const colorClass =
    teamScore > opponentScore ? "text-green-600" : teamScore < opponentScore ? "text-red-600" : "text-muted-foreground";
  return (
    <span className={`font-display ${colorClass}`}>
      {teamScore}–{opponentScore}
    </span>
  );
}

function MatchLog({ seasons }: { seasons: MatchLogSeason[] }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  if (seasons.length === 0) {
    return <p className="mt-3 text-sm text-muted-foreground">{t("player.noMatchLog")}</p>;
  }
  return (
    <div className="space-y-8">
      {seasons.map((seasonGroup) => (
        <div key={seasonGroup.season}>
          <h3 className="text-xl">{seasonGroup.season}</h3>
          <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-card shadow-card">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-secondary text-secondary-foreground">
                <tr>
                  <th className="px-3 py-2 text-left label-caps">{t("player.matchDate")}</th>
                  <th className="px-3 py-2 text-left label-caps">{t("player.statTeam")}</th>
                  <th className="px-3 py-2 text-left label-caps">{t("player.matchOpponent")}</th>
                  <th className="px-3 py-2 text-center label-caps">{t("player.matchResult")}</th>
                  <th className="px-3 py-2 text-right label-caps">
                    <span className="inline-flex items-center gap-1.5">
                      <SoccerBall className="size-3.5" aria-hidden="true" />
                      {t("player.statGoals")}
                    </span>
                  </th>
                  <th className="px-3 py-2 text-right label-caps">
                    <span className="inline-flex items-center gap-1.5">
                      <Star className="size-3.5" aria-hidden="true" />
                      {t("player.matchRating")}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {seasonGroup.matches.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => row.matches && navigate({ to: "/matches/$matchId", params: { matchId: row.matches.id } })}
                    className="cursor-pointer border-t border-border hover:bg-muted/60"
                  >
                    <td className="px-3 py-2">{formatDateInLang(row.matches?.match_date ?? null, "—")}</td>
                    <td className="px-3 py-2">
                      {row.teams?.clubs?.name ? `${row.teams.clubs.name} — ` : ""}
                      {row.teams?.name ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-2">
                        <ClubLogo name={row.matches?.opponent_name ?? "?"} url={row.matches?.opponent_logo_url ?? null} className="size-6" />
                        {row.matches?.opponent_name ?? "—"}
                        {row.matches?.competition ? (
                          <span className="text-xs text-muted-foreground">({row.matches.competition})</span>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <MatchResult teamScore={row.matches?.team_score ?? null} opponentScore={row.matches?.opponent_score ?? null} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      {row.goals_scored > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          {Array.from({ length: row.goals_scored }, (_, i) => (
                            <SoccerBall key={i} className="size-4 text-green-600" aria-hidden="true" />
                          ))}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {row.rating != null ? (
                        <span className={`font-display ${row.rating >= 7 ? "text-green-600" : "text-accent"}`}>
                          {row.rating.toFixed(1)}
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
        </div>
      ))}
    </div>
  );
}

function StatsOverview({ stats, playerId }: { stats: SeasonStatRow[]; playerId: string }) {
  const { t } = useLanguage();
  const totalApps = stats.reduce((sum, row) => sum + row.matches_played, 0);
  const totalGoals = stats.reduce((sum, row) => sum + row.goals, 0);
  let weightedTotal = 0;
  let ratedCount = 0;
  for (const row of stats) {
    if (row.average_rating != null && row.rated_matches > 0) {
      weightedTotal += row.average_rating * row.rated_matches;
      ratedCount += row.rated_matches;
    }
  }
  const avgRating = ratedCount > 0 ? weightedTotal / ratedCount : null;

  return (
    <section className="mt-10 border-t-2 border-border pt-8">
      <h2 className="text-2xl">{t("player.statsOverview")}</h2>
      <div className="mt-4 grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-card shadow-card">
        <div className="p-4 text-center">
          <p className="font-display text-3xl">{totalApps}</p>
          <p className="label-caps mt-1 flex items-center justify-center gap-1.5 text-muted-foreground">
            <Shirt className="size-3.5" aria-hidden="true" />
            {t("player.statApps")}
          </p>
        </div>
        <div className="p-4 text-center">
          <p className="font-display text-3xl">{totalGoals}</p>
          <p className="label-caps mt-1 flex items-center justify-center gap-1.5 text-muted-foreground">
            <SoccerBall className="size-3.5" aria-hidden="true" />
            {t("player.statGoals")}
          </p>
        </div>
        <div className="p-4 text-center">
          <p className={`font-display text-3xl ${avgRating != null && avgRating >= 7 ? "text-green-600" : "text-accent"}`}>
            {avgRating != null ? avgRating.toFixed(1) : "—"}
          </p>
          <p className="label-caps mt-1 flex items-center justify-center gap-1.5 text-muted-foreground">
            <Star className="size-3.5" aria-hidden="true" />
            {t("player.statAvgRating")}
          </p>
        </div>
      </div>
      <Link
        to="/players/$playerId"
        params={{ playerId }}
        search={{ tab: "stats" }}
        className="mt-3 inline-block text-sm text-primary underline"
      >
        {t("player.viewFullStats")}
      </Link>
    </section>
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

type SchoolRow = {
  id: string;
  name: string;
  logoUrl: string | null;
  date: string | null;
};

function SchoolsPlayedFor({ schools, playerId }: { schools: SchoolRow[]; playerId: string }) {
  const { t } = useLanguage();
  return (
    <div className="mt-6">
      <h2 className="text-2xl">{t("player.schoolsPlayedFor")}</h2>
      {schools.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("player.noSchools")}</p>
      ) : (
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card shadow-card">
          {schools.map((school) => (
            <li key={school.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
              <ClubLogo name={school.name} url={school.logoUrl} className="size-8" />
              <span className="font-display text-lg">{school.name || t("player.unknownClub")}</span>
              {school.date ? (
                <span className="ml-auto text-sm text-muted-foreground">
                  {formatDateInLang(school.date, t("player.unknownDate"))}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <Link
        to="/players/$playerId"
        params={{ playerId }}
        search={{ tab: "transfers" }}
        className="mt-3 inline-block text-sm text-primary underline"
      >
        {t("player.viewSchoolSpells")}
      </Link>
    </div>
  );
}

type MatchRatingRow = {
  id: string;
  goals_scored: number;
  teams: { id: string; name: string; clubs: { name: string } | null } | null;
  matches: { id: string; match_date: string; opponent_name: string } | null;
};

type DebutRow = {
  id: string;
  teamName: string | null;
  clubName: string | null;
  matchDate: string | null;
  opponentName: string | null;
  season: string | null;
};

function CareerDebuts({ debuts, birthDate }: { debuts: DebutRow[]; birthDate: string | null }) {
  const { t } = useLanguage();
  if (debuts.length === 0) {
    return <p className="mt-3 text-sm text-muted-foreground">{t("player.noDebuts")}</p>;
  }
  return (
    <ul className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card shadow-card">
      {debuts.map((row) => {
        const exactAge = birthDate && row.matchDate ? calculateAge(birthDate, row.matchDate) : null;
        const approxAge =
          exactAge == null && birthDate && row.season && /^\d{4}$/.test(row.season)
            ? calculateAge(birthDate, `${row.season}-01-01`)
            : null;
        return (
          <li key={row.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
            <span className="label-caps w-24 text-muted-foreground">
              {row.matchDate ? formatDateInLang(row.matchDate, t("player.unknownDate")) : (row.season ?? "—")}
            </span>
            <span className="font-display text-lg">
              {row.clubName ? `${row.clubName} — ` : ""}
              {row.teamName ?? t("player.unknownClub")}
            </span>
            {exactAge != null ? (
              <span className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                {t("player.ageAtDebut")} {exactAge}
              </span>
            ) : approxAge != null ? (
              <span className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                {t("player.ageAtDebut")} ~{approxAge}
              </span>
            ) : null}
            {row.opponentName ? (
              <span className="text-sm text-muted-foreground">
                {t("player.vs")} {row.opponentName}
              </span>
            ) : (
              <span className="text-xs italic text-muted-foreground">{t("player.seasonOnly")}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function CareerGoals({ goals }: { goals: MatchRatingRow[] }) {
  const { t } = useLanguage();
  if (goals.length === 0) {
    return <p className="mt-3 text-sm text-muted-foreground">{t("player.noGoals")}</p>;
  }
  return (
    <ul className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card shadow-card">
      {goals.map((row) => (
        <li key={row.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
          <span className="label-caps w-24 text-muted-foreground">
            {formatDateInLang(row.matches?.match_date ?? null, t("player.unknownDate"))}
          </span>
          <span className="font-display text-lg">
            {row.teams?.clubs?.name ? `${row.teams.clubs.name} — ` : ""}
            {row.teams?.name ?? t("player.unknownClub")}
          </span>
          {row.matches?.opponent_name ? (
            <span className="text-sm text-muted-foreground">
              {t("player.vs")} {row.matches.opponent_name}
            </span>
          ) : null}
          <span className="ml-auto flex items-center gap-1">
            {Array.from({ length: row.goals_scored }, (_, i) => (
              <SoccerBall key={i} className="size-4 text-green-600" aria-hidden="true" />
            ))}
          </span>
        </li>
      ))}
    </ul>
  );
}

function PlayerPage() {
  const { playerId } = Route.useParams();
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const { data: player } = useSuspenseQuery(playerQuery(playerId));
  const { isAdmin } = useIsAdmin();
  const { t } = useLanguage();
  if (!player) return <PlayerNotFound />;
  const activeTab = tab ?? "profile";
  const currentAge = player.birth_date ? calculateAge(player.birth_date, new Date().toISOString().slice(0, 10)) : null;
  const birthdayToday = player.birth_date ? isBirthdayToday(player.birth_date) : false;
  const parsedPosition = parsePosition(player.position);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="border-b border-border bg-pitch text-pitch-foreground pitch-stripes">
        <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-6 px-4 py-14">
          <div>
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
              <Link
                to="/players/$playerId/passport"
                params={{ playerId }}
                className="inline-flex items-center gap-2 rounded bg-accent px-3 py-1 font-display tracking-wide text-accent-foreground hover:opacity-90"
              >
                <IdCard className="size-4" aria-hidden="true" />
                {t("player.viewPassport")}
              </Link>
              {player.highlight_video_url ? (
                <a
                  href={player.highlight_video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded bg-accent px-3 py-1 font-display tracking-wide text-accent-foreground hover:opacity-90"
                >
                  <Play className="size-4" aria-hidden="true" />
                  {t("player.watchHighlights")}
                </a>
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
          {player.clubs ? (
            <Link
              to="/clubs/$clubId"
              params={{ clubId: player.clubs.id }}
              className="flex items-center gap-3 rounded-lg border border-pitch-foreground/25 bg-pitch-foreground/5 px-4 py-3 hover:bg-pitch-foreground/10"
            >
              <ClubLogo name={player.clubs.name} url={player.clubs.logo_url} className="size-12" />
              <span>
                <span className="block font-display text-lg leading-tight">{player.clubs.name}</span>
                {player.teams ? <span className="block text-sm opacity-75">{player.teams.name}</span> : null}
              </span>
            </Link>
          ) : null}
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-12">
        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            navigate({
              to: "/players/$playerId",
              params: { playerId },
              search: value === "profile" ? {} : { tab: value as "stats" | "transfers" | "career" },
              replace: true,
            })
          }
        >
          <TabsList>
            <TabsTrigger value="profile">{t("player.tabProfile")}</TabsTrigger>
            <TabsTrigger value="stats">{t("player.tabStatistics")}</TabsTrigger>
            <TabsTrigger value="transfers">{t("player.tabTransfers")}</TabsTrigger>
            <TabsTrigger value="career">{t("player.tabCareer")}</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6 grid gap-10 md:grid-cols-[2fr_1fr]">
            <div>
              <h2 className="text-2xl">{t("player.about")}</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {player.bio || t("player.noBio")}
              </p>
              <StatsOverview stats={player.season_stats} playerId={playerId} />
              <RecentTransferSection transfers={player.transfers} playerId={playerId} />
              <SchoolsPlayedFor schools={player.schools} playerId={playerId} />
              <section className="mt-10 border-t-2 border-border pt-8">
                <div className="flex flex-wrap items-start gap-8">
                  <div>
                    <h2 className="text-2xl">{t("player.onThePitch")}</h2>
                    <PitchPosition position={player.position} />
                  </div>
                  <div>
                    <h2 className="text-2xl">{t("player.recentForm")}</h2>
                    <RecentForm form={player.recent_form} />
                  </div>
                </div>
              </section>
            </div>
            <div>
              <h2 className="text-2xl">{t("player.facts")}</h2>
              <div className="mt-4 rounded-lg border border-border bg-card p-5 shadow-card">
                <Fact
                  label={t("player.position")}
                  value={
                    parsedPosition ? (
                      <span>
                        {parsedPosition.primary}
                        {parsedPosition.secondary ? (
                          <span className="ml-2 text-sm font-normal text-muted-foreground">
                            ({parsedPosition.secondary})
                          </span>
                        ) : null}
                      </span>
                    ) : null
                  }
                />
                <Fact
                  label={player.birth_date ? t("player.birthday") : t("player.birthYear")}
                  value={
                    player.birth_date ? (
                      <span className="inline-flex items-center gap-2">
                        {formatDateInLang(player.birth_date, "—")}
                        {currentAge != null ? <span className="text-lg text-muted-foreground">({currentAge})</span> : null}
                        {birthdayToday ? (
                          <Cake className="size-5 text-accent" aria-label={t("player.happyBirthday")} />
                        ) : null}
                      </span>
                    ) : (
                      player.birth_year
                    )
                  }
                />
                <Fact
                  label={t("player.birthplace")}
                  value={
                    player.birthplace ? (
                      <span className="inline-flex items-center gap-2">
                        {player.birthplace}
                        {player.birthplace_country_code === "US" && player.birthplace_state ? (
                          <UsStateFlag code={player.birthplace_state} className="h-5 w-[30px]" />
                        ) : (
                          <CountryFlag code={player.birthplace_country_code} className="h-5 w-[30px]" />
                        )}
                      </span>
                    ) : null
                  }
                />
                <Fact label={t("player.foot")} value={player.preferred_foot} />
                <Fact label={t("player.height")} value={player.height_cm ? `${player.height_cm} cm` : null} />
                <Fact label={t("player.nationality")} value={player.nationality} />
                <Fact label={t("player.team")} value={player.teams?.name} />
                <Fact label={t("player.ageGroup")} value={player.teams?.age_group} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="mt-6">
            <SeasonStats stats={player.season_stats} />
            <section className="mt-10 border-t-2 border-border pt-8">
              <h2 className="text-2xl">{t("player.matchLog")}</h2>
              <div className="mt-4">
                <MatchLog seasons={player.match_log} />
              </div>
            </section>
          </TabsContent>

          <TabsContent value="transfers" className="mt-6 space-y-0">
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
            <TrialsSection trials={player.transfers.filter((transfer) => transfer.org_type === "trial")} />
            <section className="mt-10 border-t-2 border-border pt-8">
              <h2 className="text-2xl">{t("player.pastTeams")}</h2>
              <PastTeams memberships={player.team_memberships} />
            </section>
          </TabsContent>

          <TabsContent value="career" className="mt-6">
            <section>
              <h2 className="text-2xl">{t("player.careerDebuts")}</h2>
              <CareerDebuts debuts={player.debuts} birthDate={player.birth_date} />
            </section>
            <section className="mt-10 border-t-2 border-border pt-8">
              <h2 className="text-2xl">{t("player.careerGoals")}</h2>
              <CareerGoals goals={player.goals} />
            </section>
          </TabsContent>
        </Tabs>
      </main>
      <SiteFooter />
    </div>
  );
}
