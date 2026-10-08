import { queryOptions } from "@tanstack/react-query";
import { getClub, getClubFilters, getOverview, getPlayer, listClubs, listPlayers } from "./grassroots.functions";
import { getLeagueStats, getMatch, listLeagues, listMatches } from "./matches.functions";

export const overviewQuery = () =>
  queryOptions({ queryKey: ["overview"], queryFn: () => getOverview() });

export const playersQuery = (q: string) =>
  queryOptions({ queryKey: ["players", q], queryFn: () => listPlayers({ data: { q } }) });

export const playerQuery = (id: string) =>
  queryOptions({ queryKey: ["player", id], queryFn: () => getPlayer({ data: { id } }) });

export const clubsQuery = (q: string, country?: string, league?: string) =>
  queryOptions({
    queryKey: ["clubs", q, country ?? null, league ?? null],
    queryFn: () =>
      listClubs({
        data: { q, ...(country ? { country } : {}), ...(league ? { league } : {}) },
      }),
  });

export const clubFiltersQuery = (country?: string) =>
  queryOptions({
    queryKey: ["club-filters", country ?? null],
    queryFn: () => getClubFilters({ data: country ? { country } : {} }),
  });

export const clubQuery = (id: string) =>
  queryOptions({ queryKey: ["club", id], queryFn: () => getClub({ data: { id } }) });

export const matchesQuery = (teamId?: string) =>
  queryOptions({
    queryKey: ["matches", teamId ?? null],
    queryFn: () => listMatches({ data: teamId ? { teamId } : {} }),
  });

export const matchQuery = (id: string) =>
  queryOptions({ queryKey: ["match", id], queryFn: () => getMatch({ data: { id } }) });

export const leaguesQuery = () =>
  queryOptions({ queryKey: ["leagues"], queryFn: () => listLeagues() });

export const leagueStatsQuery = (league: string) =>
  queryOptions({ queryKey: ["league-stats", league], queryFn: () => getLeagueStats({ data: { league } }) });
