import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveLogoUrls, applyLogo } from "./logo-urls.server";

export type AlertEvent = {
  key: string;
  kind: "result" | "fixture" | "rating";
  date: string;
  title: string;
  detail: string;
  matchId: string;
  logo: string | null;
  unread: boolean;
};

const DAY = 24 * 60 * 60 * 1000;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Fixtures, results and ratings for everything the signed-in user follows. */
export const getAlerts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const now = Date.now();
    const from = isoDay(now - 21 * DAY);
    const to = isoDay(now + 7 * DAY);

    const { data: follows, error: followsError } = await supabase.from("follows").select("target_type, target_id");
    if (followsError) throw new Error(followsError.message);
    const idsOf = (type: string) => (follows ?? []).filter((f) => f.target_type === type).map((f) => f.target_id);
    const clubIds = idsOf("club");
    const followedTeamIds = idsOf("team");
    const playerIds = idsOf("player");

    const [clubs, players, followedTeams, clubTeams] = await Promise.all([
      clubIds.length
        ? supabase.from("clubs").select("id, name, logo_url, city, country").in("id", clubIds)
        : Promise.resolve({ data: [], error: null }),
      playerIds.length
        ? supabase.from("players").select("id, full_name, photo_url, position").in("id", playerIds)
        : Promise.resolve({ data: [], error: null }),
      followedTeamIds.length
        ? supabase.from("teams").select("id, name, clubs(name)").in("id", followedTeamIds)
        : Promise.resolve({ data: [], error: null }),
      clubIds.length
        ? supabase.from("teams").select("id").in("club_id", clubIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    for (const result of [clubs, players, followedTeams, clubTeams]) {
      if (result.error) throw new Error(result.error.message);
    }

    const teamIds = [...new Set([...followedTeamIds, ...(clubTeams.data ?? []).map((t) => t.id)])];
    const [matches, ratings] = await Promise.all([
      teamIds.length
        ? supabase
            .from("matches")
            .select(
              "id, match_date, team_score, opponent_score, opponent_name, team_id, teams(name, clubs(name, logo_url)), opponent_club:clubs!matches_opponent_club_id_fkey(name)",
            )
            .in("team_id", teamIds)
            .gte("match_date", from)
            .lte("match_date", to)
        : Promise.resolve({ data: [], error: null }),
      playerIds.length
        ? supabase
            .from("match_player_ratings")
            .select(
              "id, rating, goals_scored, created_at, players(full_name), matches(id, match_date, opponent_name, opponent_club:clubs!matches_opponent_club_id_fkey(name), teams(name, clubs(name)))",
            )
            .in("player_id", playerIds)
            .gte("created_at", new Date(now - 21 * DAY).toISOString())
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (matches.error) throw new Error(matches.error.message);
    if (ratings.error) throw new Error(ratings.error.message);

    const logoMap = await resolveLogoUrls([
      ...(clubs.data ?? []).map((c) => c.logo_url),
      ...(matches.data ?? []).map((m) => m.teams?.clubs?.logo_url),
    ]);

    const today = isoDay(now);
    const events: Omit<AlertEvent, "unread">[] = [];
    for (const m of matches.data ?? []) {
      const team = m.teams?.clubs?.name ?? m.teams?.name ?? "—";
      const opponent = m.opponent_club?.name ?? m.opponent_name;
      const logo = applyLogo(m.teams?.clubs?.logo_url, logoMap);
      if (m.team_score != null && m.opponent_score != null) {
        events.push({
          key: `result:${m.id}`,
          kind: "result",
          date: m.match_date,
          title: `${team} ${m.team_score}–${m.opponent_score} ${opponent}`,
          detail: m.match_date,
          matchId: m.id,
          logo,
        });
      } else if (m.match_date >= today) {
        events.push({
          key: `fixture:${m.id}`,
          kind: "fixture",
          date: m.match_date,
          title: `${team} vs ${opponent}`,
          detail: m.match_date,
          matchId: m.id,
          logo,
        });
      }
    }
    for (const r of ratings.data ?? []) {
      if (!r.matches || r.rating == null) continue;
      const opponent = r.matches.opponent_club?.name ?? r.matches.opponent_name;
      const goals = r.goals_scored > 0 ? `${r.goals_scored} ${r.goals_scored === 1 ? "goal" : "goals"} · ` : "";
      events.push({
        key: `rating:${r.id}`,
        kind: "rating",
        date: r.matches.match_date,
        title: `${r.players?.full_name ?? "Player"} rated ${r.rating.toFixed(1)}`,
        detail: `${goals}vs ${opponent}`,
        matchId: r.matches.id,
        logo: null,
      });
    }

    const keys = events.map((e) => e.key);
    const { data: reads, error: readsError } = keys.length
      ? await supabase.from("alert_reads").select("event_key").in("event_key", keys)
      : { data: [], error: null };
    if (readsError) throw new Error(readsError.message);
    const read = new Set((reads ?? []).map((r) => r.event_key));

    const withState: AlertEvent[] = events
      .map((e) => ({ ...e, unread: !read.has(e.key) }))
      .sort((a, b) => b.date.localeCompare(a.date));

    return {
      events: withState,
      unreadCount: withState.filter((e) => e.unread).length,
      following: {
        clubs: (clubs.data ?? []).map((c) => ({ ...c, logo_url: applyLogo(c.logo_url, logoMap) })),
        teams: followedTeams.data ?? [],
        players: players.data ?? [],
      },
    };
  });

export const markAlertsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { keys: string[] }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.keys.length === 0) return { marked: 0 };
    // Insert-only table: ON CONFLICT DO NOTHING, no update policy needed.
    const { error } = await supabase
      .from("alert_reads")
      .upsert(
        data.keys.map((event_key) => ({ user_id: userId, event_key })),
        { onConflict: "user_id,event_key", ignoreDuplicates: true },
      );
    if (error) throw new Error(error.message);
    return { marked: data.keys.length };
  });
