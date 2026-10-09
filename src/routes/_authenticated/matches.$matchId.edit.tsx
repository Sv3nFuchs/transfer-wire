import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIsAdmin } from "@/hooks/useIsAdmin";

export const Route = createFileRoute("/_authenticated/matches/$matchId/edit")({
  component: EditMatchPage,
});

type MatchForm = {
  opponent_name: string;
  match_date: string;
  home_away: string;
  team_score: string;
  opponent_score: string;
  competition: string;
  notes: string;
};

const emptyMatchForm: MatchForm = {
  opponent_name: "",
  match_date: "",
  home_away: "home",
  team_score: "",
  opponent_score: "",
  competition: "",
  notes: "",
};

type RosterRow = { id: string; full_name: string; shirt_number: number | null; position: string | null };
type RatingForm = { rating: string; goals: string; injured: boolean; minute: string; markProfile: boolean };
const blankRating: RatingForm = { rating: "", goals: "", injured: false, minute: "", markProfile: true };

function EditMatchPage() {
  const { matchId } = Route.useParams();
  const { isAdmin, isLoading: roleLoading } = useIsAdmin();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<MatchForm>(emptyMatchForm);
  const [ratings, setRatings] = useState<Record<string, RatingForm>>({});
  const [initialRatedIds, setInitialRatedIds] = useState<Set<string>>(new Set());
  const [displayedPlayers, setDisplayedPlayers] = useState<RosterRow[]>([]);
  const [addPlayerId, setAddPlayerId] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: match, isLoading } = useQuery({
    queryKey: ["match-edit", matchId],
    queryFn: async () => {
      const { data, error } = await supabase.from("matches").select("*, teams(id, name)").eq("id", matchId).maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  // Current roster of the match's own team — the common case (most players
  // being rated are still on that team today).
  const { data: roster } = useQuery({
    queryKey: ["match-roster", match?.team_id],
    enabled: Boolean(match?.team_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, full_name, shirt_number, position")
        .eq("team_id", match!.team_id)
        .order("full_name");
      if (error) throw new Error(error.message);
      return (data ?? []) as RosterRow[];
    },
  });

  // Every registered player, for adding someone who has since moved to a
  // different team (e.g. rating a past-season match after they moved on).
  const { data: allPlayers } = useQuery({
    queryKey: ["all-players-for-rating"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, full_name, shirt_number, position, clubs(name), teams(name)")
        .order("full_name");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!match) return;
    setForm({
      opponent_name: match.opponent_name ?? "",
      match_date: match.match_date ?? "",
      home_away: match.home_away ?? "home",
      team_score: match.team_score != null ? String(match.team_score) : "",
      opponent_score: match.opponent_score != null ? String(match.opponent_score) : "",
      competition: match.competition ?? "",
      notes: match.notes ?? "",
    });
  }, [match]);

  useEffect(() => {
    if (!roster) return;
    void (async () => {
      const { data, error } = await supabase
        .from("match_player_ratings")
        .select("player_id, rating, goals_scored, injured_off, minute_off, players(id, full_name, shirt_number, position)")
        .eq("match_id", matchId);
      if (error) {
        toast.error("Could not load ratings: " + error.message);
        return;
      }
      const existing = data ?? [];
      const existingIds = new Set(existing.map((row) => row.player_id));

      // Anyone already rated on this match stays visible even if they've
      // since moved to a different team than the one this match belongs to.
      const extraFromRatings: RosterRow[] = existing
        .filter((row) => row.players && !roster.some((p) => p.id === row.player_id))
        .map((row) => ({
          id: row.players!.id,
          full_name: row.players!.full_name,
          shirt_number: row.players!.shirt_number,
          position: row.players!.position,
        }));
      setDisplayedPlayers([...roster, ...extraFromRatings]);

      const ratingsById = new Map(existing.map((row) => [row.player_id, row]));
      const next: Record<string, RatingForm> = {};
      for (const player of [...roster, ...extraFromRatings]) {
        const row = ratingsById.get(player.id);
        next[player.id] = {
          rating: row?.rating != null ? String(row.rating) : "",
          goals: row?.goals_scored ? String(row.goals_scored) : "",
          injured: row?.injured_off ?? false,
          minute: row?.minute_off != null ? String(row.minute_off) : "",
          markProfile: true,
        };
      }
      setRatings(next);
      setInitialRatedIds(existingIds);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roster, matchId]);

  function set<K extends keyof MatchForm>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setRating<K extends keyof RatingForm>(playerId: string, field: K, value: RatingForm[K]) {
    setRatings((prev) => ({
      ...prev,
      [playerId]: { ...(prev[playerId] ?? blankRating), [field]: value },
    }));
  }

  function handleAddPlayer() {
    if (!addPlayerId || !allPlayers) return;
    if (displayedPlayers.some((p) => p.id === addPlayerId)) {
      setAddPlayerId("");
      return;
    }
    const player = allPlayers.find((p) => p.id === addPlayerId);
    if (!player) return;
    setDisplayedPlayers((prev) => [
      ...prev,
      { id: player.id, full_name: player.full_name, shirt_number: player.shirt_number, position: player.position },
    ]);
    setRatings((prev) => ({ ...prev, [player.id]: prev[player.id] ?? blankRating }));
    setAddPlayerId("");
  }

  const num = (value: string) => (value.trim() === "" ? null : Number(value));
  const str = (value: string) => (value.trim() === "" ? null : value.trim());

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!match) return;
    setSaving(true);

    const { error: matchError } = await supabase
      .from("matches")
      .update({
        opponent_name: form.opponent_name.trim() || "Unknown",
        match_date: form.match_date,
        home_away: form.home_away,
        team_score: num(form.team_score),
        opponent_score: num(form.opponent_score),
        competition: str(form.competition),
        notes: str(form.notes),
      })
      .eq("id", matchId);
    if (matchError) {
      toast.error("Could not save match: " + matchError.message);
      setSaving(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const season = form.match_date.slice(0, 4);
    const toUpsert: { match_id: string; player_id: string; team_id: string; season: string; rating: number | null; goals_scored: number; injured_off: boolean; minute_off: number | null; created_by: string | null }[] = [];
    const markInjured: string[] = [];
    const toDelete: string[] = [];
    for (const [playerId, entry] of Object.entries(ratings)) {
      const rating = entry.rating.trim() === "" ? null : Number(entry.rating);
      const goals = entry.goals.trim() === "" ? 0 : Number(entry.goals);
      const minute = entry.minute.trim() === "" ? null : Math.min(130, Math.max(0, Math.round(Number(entry.minute))));
      // Coming off injured counts as featuring, even with no rating or goals.
      const featured = rating != null || goals > 0 || entry.injured;
      if (featured) {
        toUpsert.push({
          match_id: matchId,
          player_id: playerId,
          team_id: match.team_id,
          season,
          rating,
          goals_scored: goals,
          injured_off: entry.injured,
          minute_off: entry.injured && minute != null && !Number.isNaN(minute) ? minute : null,
          created_by: userData.user?.id ?? null,
        });
        if (entry.injured && entry.markProfile) markInjured.push(playerId);
      } else if (initialRatedIds.has(playerId)) {
        toDelete.push(playerId);
      }
    }

    if (toUpsert.length > 0) {
      const { error } = await supabase.from("match_player_ratings").upsert(toUpsert, { onConflict: "match_id,player_id" });
      if (error) {
        toast.error("Could not save ratings: " + error.message);
        setSaving(false);
        return;
      }
    }
    if (markInjured.length > 0) {
      // Also show the player as injured on their profile (best effort: only the
      // profile's owner or an admin can change it).
      const { error } = await supabase
        .from("players")
        .update({
          injury_status: "injured",
          injury_since: form.match_date,
          injury_note: `Came off injured against ${form.opponent_name.trim() || "the opposition"}`,
        })
        .in("id", markInjured);
      if (error) toast.error("Match saved, but the profile could not be marked injured: " + error.message);
    }
    if (toDelete.length > 0) {
      const { error } = await supabase
        .from("match_player_ratings")
        .delete()
        .eq("match_id", matchId)
        .in("player_id", toDelete);
      if (error) {
        toast.error("Could not clear ratings: " + error.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    await queryClient.invalidateQueries();
    toast.success("Match saved.");
    navigate({ to: "/matches/$matchId", params: { matchId } });
  }

  async function handleDelete() {
    if (!window.confirm("Delete this match permanently?")) return;
    const { error } = await supabase.from("matches").delete().eq("id", matchId);
    if (error) {
      toast.error("Could not delete: " + error.message);
      return;
    }
    await queryClient.invalidateQueries();
    toast.success("Match deleted.");
    navigate({ to: "/matches" });
  }

  if (roleLoading || isLoading) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <p className="p-10 text-center text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="text-3xl">Admin only</h1>
          <p className="mt-3 text-sm text-muted-foreground">Your account doesn't have permission to edit matches.</p>
          <Link to="/matches" className="mt-5 inline-block text-primary underline">
            Back to matches
          </Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <p className="p-10 text-center text-sm text-muted-foreground">The match doesn't exist.</p>
      </div>
    );
  }

  const addablePlayers = (allPlayers ?? []).filter((p) => !displayedPlayers.some((d) => d.id === p.id));

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="label-caps text-muted-foreground">Edit match</p>
        <h1 className="mt-1 text-4xl">{match.teams?.name ?? "Match"}</h1>

        <form onSubmit={handleSave} className="mt-8 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="opponent_name">Opponent</Label>
            <Input id="opponent_name" value={form.opponent_name} onChange={(e) => set("opponent_name", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="match_date">Date</Label>
            <Input id="match_date" type="date" value={form.match_date} onChange={(e) => set("match_date", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="home_away">Home / away</Label>
            <select
              id="home_away"
              value={form.home_away}
              onChange={(e) => set("home_away", e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="home">Home</option>
              <option value="away">Away</option>
              <option value="neutral">Neutral venue</option>
            </select>
          </div>
          <div>
            <Label htmlFor="team_score">Team score</Label>
            <Input id="team_score" inputMode="numeric" value={form.team_score} onChange={(e) => set("team_score", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="opponent_score">Opponent score</Label>
            <Input id="opponent_score" inputMode="numeric" value={form.opponent_score} onChange={(e) => set("opponent_score", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="competition">Competition (optional)</Label>
            <Input id="competition" value={form.competition} onChange={(e) => set("competition", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input id="notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>

          <div className="sm:col-span-2">
            <h2 className="mt-4 text-2xl">Player ratings</h2>
            <p className="text-sm text-muted-foreground">
              Rate 1.0–10.0. Leave rating blank and goals at 0 for players who didn't feature. Includes this team's
              current roster — add anyone else (e.g. a player who has since moved teams) below.
            </p>
            {displayedPlayers.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No players yet — add one below.</p>
            ) : (
              <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-card">
                {displayedPlayers.map((player) => (
                  <li key={player.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <span className="w-6 text-sm text-muted-foreground">{player.shirt_number ?? "–"}</span>
                    <span className="font-display text-lg">{player.full_name}</span>
                    <span className="text-xs text-muted-foreground">{player.position}</span>
                    <div className="ml-auto flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-1 text-sm">
                        Goals
                        <Input
                          className="w-16"
                          inputMode="numeric"
                          value={ratings[player.id]?.goals ?? ""}
                          onChange={(e) => setRating(player.id, "goals", e.target.value)}
                        />
                      </label>
                      <label className="flex items-center gap-1 text-sm">
                        Rating
                        <Input
                          className="w-20"
                          inputMode="decimal"
                          placeholder="7.5"
                          value={ratings[player.id]?.rating ?? ""}
                          onChange={(e) => setRating(player.id, "rating", e.target.value)}
                        />
                      </label>
                    </div>
                    <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={ratings[player.id]?.injured ?? false}
                          onChange={(e) => setRating(player.id, "injured", e.target.checked)}
                        />
                        Came off injured
                      </label>
                      {ratings[player.id]?.injured ? (
                        <>
                          <label className="flex items-center gap-1">
                            Minute
                            <Input
                              className="w-16"
                              inputMode="numeric"
                              placeholder="45"
                              value={ratings[player.id]?.minute ?? ""}
                              onChange={(e) => setRating(player.id, "minute", e.target.value)}
                            />
                          </label>
                          <button
                            type="button"
                            className="text-primary underline"
                            onClick={() => setRating(player.id, "minute", "45")}
                          >
                            Half time
                          </button>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={ratings[player.id]?.markProfile ?? true}
                              onChange={(e) => setRating(player.id, "markProfile", e.target.checked)}
                            />
                            Also mark as injured on their profile
                          </label>
                        </>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                value={addPlayerId}
                onChange={(e) => setAddPlayerId(e.target.value)}
                className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Add a player…</option>
                {addablePlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.full_name}
                    {player.clubs?.name || player.teams?.name
                      ? ` (${[player.clubs?.name, player.teams?.name].filter(Boolean).join(" — ")})`
                      : ""}
                  </option>
                ))}
              </select>
              <Button type="button" variant="outline" size="sm" disabled={!addPlayerId} onClick={handleAddPlayer}>
                Add
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <Button type="submit" variant="accent" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button asChild variant="outline" type="button">
              <Link to="/matches/$matchId" params={{ matchId }}>
                Cancel
              </Link>
            </Button>
            <Button type="button" variant="destructive" className="ml-auto" onClick={handleDelete}>
              Delete match
            </Button>
          </div>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
