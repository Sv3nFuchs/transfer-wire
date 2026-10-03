import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type TeamRef = { id: string; name: string; logo?: string | null };
type StandingsRow = { team: TeamRef };
type Series = { name?: string; groups?: { standings?: StandingsRow[] }[] };

const ALLOWED_HOSTS = new Set(["www.everysport.com", "everysport.com"]);

function readPageProps(html: string) {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match?.[1]) {
    throw new Error("Could not find data on the Everysport page — its layout may have changed.");
  }
  try {
    const json = JSON.parse(match[1]) as { props?: { pageProps?: Record<string, unknown> } };
    if (!json.props?.pageProps) throw new Error("missing pageProps");
    return json.props.pageProps;
  } catch {
    throw new Error("Could not parse the Everysport page's data.");
  }
}

/**
 * Works for both page types: a league page (division + a single series of
 * standings) and a team page (that team's series, nested under `.series`).
 * Standings carry logos; a league page's division.teams fills in any club
 * the standings table doesn't list (e.g. other groups of the same division).
 */
export function collectEverysportTeams(html: string) {
  const props = readPageProps(html);
  const standings = props["standings"] as (Series & { series?: Series[] }) | undefined;
  const seriesList: Series[] = standings?.series ?? (standings ? [standings] : []);
  const division = props["division"] as
    | { name?: string; countryCode?: string; teams?: TeamRef[] }
    | undefined;

  const teams = new Map<string, TeamRef>();
  for (const series of seriesList) {
    for (const group of series.groups ?? []) {
      for (const row of group.standings ?? []) {
        if (row.team?.id && row.team.name) teams.set(row.team.id, row.team);
      }
    }
  }
  for (const team of division?.teams ?? []) {
    if (team.id && team.name && !teams.has(team.id)) teams.set(team.id, team);
  }
  if (teams.size === 0) throw new Error("No teams found on that Everysport page.");

  const rawName = division?.name ?? seriesList[0]?.name ?? "";
  // "Division 6 Skåne sydvästra A" -> "Division 6"; "Allsvenskan" stays as is.
  const level = rawName.match(/^Division \d+/)?.[0] ?? rawName;

  return {
    teams: [...teams.values()],
    level: level || null,
    countryCode: division?.countryCode?.toUpperCase() ?? null,
  };
}

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

export async function importClubsFromEverysport(
  supabase: SupabaseClient<Database>,
  options: { url: string; level?: string | null | undefined; userId: string },
) {
  let parsed: URL;
  const raw = options.url.trim();
  try {
    parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    throw new Error("That doesn't look like a valid URL.");
  }
  if (parsed.protocol !== "https:" || !ALLOWED_HOSTS.has(parsed.hostname)) {
    throw new Error("Only everysport.com league or team page URLs can be imported.");
  }

  const res = await fetch(parsed.toString(), {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; TransferWire/1.0)" },
  });
  if (!res.ok) throw new Error(`Everysport request failed: ${res.status} ${res.statusText}`);
  const { teams, level: detectedLevel, countryCode } = collectEverysportTeams(await res.text());
  const level = options.level?.trim() || detectedLevel;
  const code = countryCode ?? "SE";
  const country = code === "SE" ? "Sweden" : code;

  let created = 0;
  let linked = 0;
  let existing = 0;

  for (const team of teams) {
    const { data: byId } = await supabase
      .from("clubs")
      .select("id")
      .eq("everysport_id", team.id)
      .maybeSingle();
    if (byId) {
      existing += 1;
      continue;
    }

    const { data: byName } = await supabase
      .from("clubs")
      .select("id, logo_url, level")
      .ilike("name", escapeLike(team.name))
      .maybeSingle();
    if (byName) {
      // Same club added by hand earlier: attach the Everysport id and fill
      // only blanks, so nothing an admin typed gets overwritten.
      const { error } = await supabase
        .from("clubs")
        .update({
          everysport_id: team.id,
          ...(byName.logo_url ? {} : { logo_url: team.logo ?? null }),
          ...(byName.level ? {} : { level }),
        })
        .eq("id", byName.id);
      if (error) throw new Error(`Could not update ${team.name}: ${error.message}`);
      linked += 1;
      continue;
    }

    const { error } = await supabase.from("clubs").insert({
      name: team.name,
      country,
      country_code: code,
      org_type: "club",
      level,
      logo_url: team.logo ?? null,
      everysport_id: team.id,
      created_by: options.userId,
    });
    if (error) throw new Error(`Could not add ${team.name}: ${error.message}`);
    created += 1;
  }

  return { total: teams.length, created, linked, existing, level };
}
