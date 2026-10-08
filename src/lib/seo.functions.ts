import { createServerFn } from "@tanstack/react-start";
import { createPublicClient } from "./public-client.server";
import { isIndexablePlayer } from "./seo";

const PAGE = 1000;

async function fetchAll<T>(load: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const rows: T[] = [];
  for (let from = 0; from < 50_000; from += PAGE) {
    const { data, error } = await load(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < PAGE) break;
  }
  return rows;
}

/** Every public page worth listing in the sitemap. */
export const getSitemapPaths = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createPublicClient();
  const [players, clubs, matches] = await Promise.all([
    fetchAll((from, to) => supabase.from("players").select("id, birth_year").order("id").range(from, to)),
    fetchAll((from, to) => supabase.from("clubs").select("id").order("id").range(from, to)),
    fetchAll((from, to) => supabase.from("matches").select("id").order("id").range(from, to)),
  ]);
  return [
    "/",
    "/players",
    "/clubs",
    "/matches",
    ...players.filter((p) => isIndexablePlayer(p.birth_year)).map((p) => `/players/${p.id}`),
    ...clubs.map((c) => `/clubs/${c.id}`),
    ...matches.map((m) => `/matches/${m.id}`),
  ];
});
