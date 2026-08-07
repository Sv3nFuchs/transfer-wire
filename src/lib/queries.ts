import { queryOptions } from "@tanstack/react-query";
import { getClub, getOverview, getPlayer, listClubs, listPlayers } from "./grassroots.functions";

export const overviewQuery = () =>
  queryOptions({ queryKey: ["overview"], queryFn: () => getOverview() });

export const playersQuery = (q: string) =>
  queryOptions({ queryKey: ["players", q], queryFn: () => listPlayers({ data: { q } }) });

export const playerQuery = (id: string) =>
  queryOptions({ queryKey: ["player", id], queryFn: () => getPlayer({ data: { id } }) });

export const clubsQuery = (q: string) =>
  queryOptions({ queryKey: ["clubs", q], queryFn: () => listClubs({ data: { q } }) });

export const clubQuery = (id: string) =>
  queryOptions({ queryKey: ["club", id], queryFn: () => getClub({ data: { id } }) });
