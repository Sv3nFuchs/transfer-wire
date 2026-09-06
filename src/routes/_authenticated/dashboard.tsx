import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { COUNTRIES, countryName } from "@/lib/flags";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "My page — Grassroots Football Hub" },
      {
        name: "description",
        content: "Add and manage your clubs, teams and player profiles on Grassroots Football Hub.",
      },
      { property: "og:title", content: "My page — Grassroots Football Hub" },
      {
        property: "og:description",
        content: "Manage clubs, teams and players you have registered.",
      },
    ],
  }),
  component: Dashboard,
});

function useMyData() {
  const clubs = useQuery({
    queryKey: ["my-clubs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select("id, name, city, level")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
  const teams = useQuery({
    queryKey: ["my-teams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, age_group, league, season, club_id, clubs(name)")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
  const players = useQuery({
    queryKey: ["my-players"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, full_name, position, club_id, team_id, clubs(name), teams(name)")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });
  const matches = useQuery({
    queryKey: ["my-matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("id, opponent_name, match_date, team_score, opponent_score, teams(name, clubs(name)), opponent_club:clubs!matches_opponent_club_id_fkey(name)")
        .order("match_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  return { clubs, teams, players, matches };
}

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { clubs, teams, players, matches } = useMyData();
  const [saving, setSaving] = useState(false);

  const myClubs = clubs.data ?? [];
  const myTeams = teams.data ?? [];
  const myPlayers = players.data ?? [];
  const myMatches = matches.data ?? [];

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function submit(table: "clubs" | "teams" | "players" | "matches", payload: Record<string, unknown>, form: HTMLFormElement) {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from(table)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({ ...payload, created_by: userData.user?.id } as any);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved!");
    form.reset();
    void queryClient.invalidateQueries();
  }

  function num(value: FormDataEntryValue | null) {
    const parsed = Number(value);
    return value && !Number.isNaN(parsed) ? parsed : null;
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-4xl">My page</h1>
          <Button onClick={handleSignOut} variant="outline" size="sm" className="ml-auto">
            Log out
          </Button>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Register a club first, then teams, then players. Everything you add becomes instantly
          searchable to all visitors.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {/* Klubb */}
          <form
            className="rounded-lg border border-border bg-card p-5 shadow-card"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const fd = new FormData(form);
              const countryCode = (fd.get("country_code") as string) || "SE";
              void submit(
                "clubs",
                {
                  name: fd.get("name"),
                  country: countryName(countryCode),
                  country_code: countryCode,
                  city: fd.get("city") || null,
                  level: fd.get("level") || null,
                  founded_year: num(fd.get("founded_year")),
                  description: fd.get("description") || null,
                },
                form,
              );
            }}
          >
            <h2 className="text-2xl">New club</h2>
            <div className="mt-4 space-y-3">
              <div>
                <Label htmlFor="club-name">Club name</Label>
                <Input id="club-name" name="name" required />
              </div>
              <div>
                <Label htmlFor="club-city">City</Label>
                <Input id="club-city" name="city" placeholder="Gothenburg" />
              </div>
              <div>
                <Label htmlFor="club-country">Country</Label>
                <select
                  id="club-country"
                  name="country_code"
                  defaultValue="SE"
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {COUNTRIES.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="club-level">Level</Label>
                <Input id="club-level" name="level" placeholder="Division 5 / Sunday League / U14" />
              </div>
              <div>
                <Label htmlFor="club-founded">Founded</Label>
                <Input id="club-founded" name="founded_year" type="number" placeholder="1974" />
              </div>
              <div>
                <Label htmlFor="club-desc">Description</Label>
                <Textarea id="club-desc" name="description" rows={3} />
              </div>
              <Button type="submit" disabled={saving} className="w-full">
                Save club
              </Button>
            </div>
          </form>

          {/* Lag */}
          <form
            className="rounded-lg border border-border bg-card p-5 shadow-card"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const fd = new FormData(form);
              void submit(
                "teams",
                {
                  club_id: fd.get("club_id"),
                  name: fd.get("name"),
                  age_group: fd.get("age_group") || null,
                  league: fd.get("league") || null,
                  season: fd.get("season") || null,
                },
                form,
              );
            }}
          >
            <h2 className="text-2xl">New team</h2>
            <div className="mt-4 space-y-3">
              <div>
                <Label htmlFor="team-club">Club</Label>
                <select
                  id="team-club"
                  name="club_id"
                  required
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select club…</option>
                  {myClubs.map((club) => (
                    <option key={club.id} value={club.id}>
                      {club.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="team-name">Team name</Label>
                <Input id="team-name" name="name" required placeholder="First team / U15 Boys" />
              </div>
              <div>
                <Label htmlFor="team-age">Age group</Label>
                <Input id="team-age" name="age_group" placeholder="Senior, U15, U11" />
              </div>
              <div>
                <Label htmlFor="team-league">League</Label>
                <Input id="team-league" name="league" placeholder="Div 6 Gothenburg D" />
              </div>
              <div>
                <Label htmlFor="team-season">Season</Label>
                <Input id="team-season" name="season" placeholder="2026" />
              </div>
              <Button type="submit" disabled={saving || myClubs.length === 0} className="w-full">
                Save team
              </Button>
            </div>
          </form>

          {/* Spelare */}
          <form
            className="rounded-lg border border-border bg-card p-5 shadow-card"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const fd = new FormData(form);
              void submit(
                "players",
                {
                  full_name: fd.get("full_name"),
                  club_id: fd.get("club_id") || null,
                  team_id: fd.get("team_id") || null,
                  position: fd.get("position") || null,
                  birth_year: num(fd.get("birth_year")),
                  preferred_foot: fd.get("preferred_foot") || null,
                  height_cm: num(fd.get("height_cm")),
                  shirt_number: num(fd.get("shirt_number")),
                  nationality: fd.get("nationality") || null,
                  bio: fd.get("bio") || null,
                },
                form,
              );
            }}
          >
            <h2 className="text-2xl">New player</h2>
            <div className="mt-4 space-y-3">
              <div>
                <Label htmlFor="p-name">Name</Label>
                <Input id="p-name" name="full_name" required />
              </div>
              <div>
                <Label htmlFor="p-club">Club</Label>
                <select
                  id="p-club"
                  name="club_id"
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">No club</option>
                  {myClubs.map((club) => (
                    <option key={club.id} value={club.id}>
                      {club.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="p-team">Team</Label>
                <select
                  id="p-team"
                  name="team_id"
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">No team</option>
                  {myTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.clubs?.name} — {team.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="p-pos">Position</Label>
                  <Input id="p-pos" name="position" placeholder="Midfield" />
                </div>
                <div>
                  <Label htmlFor="p-birth">Birth year</Label>
                  <Input id="p-birth" name="birth_year" type="number" placeholder="2009" />
                </div>
                <div>
                  <Label htmlFor="p-foot">Foot</Label>
                  <Input id="p-foot" name="preferred_foot" placeholder="Right" />
                </div>
                <div>
                  <Label htmlFor="p-height">Height (cm)</Label>
                  <Input id="p-height" name="height_cm" type="number" />
                </div>
                <div>
                  <Label htmlFor="p-shirt">Shirt number</Label>
                  <Input id="p-shirt" name="shirt_number" type="number" />
                </div>
                <div>
                  <Label htmlFor="p-nat">Nationality</Label>
                  <Input id="p-nat" name="nationality" placeholder="Sweden" />
                </div>
              </div>
              <div>
                <Label htmlFor="p-bio">About the player</Label>
                <Textarea id="p-bio" name="bio" rows={3} />
              </div>
              <Button type="submit" disabled={saving} className="w-full">
                Save player
              </Button>
            </div>
          </form>

          {/* Match */}
          <form
            className="rounded-lg border border-border bg-card p-5 shadow-card"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const fd = new FormData(form);
              void submit(
                "matches",
                {
                  team_id: fd.get("team_id"),
                  opponent_club_id: fd.get("opponent_club_id") || null,
                  opponent_name: fd.get("opponent_name"),
                  match_date: fd.get("match_date"),
                  home_away: fd.get("home_away") || "home",
                  team_score: num(fd.get("team_score")),
                  opponent_score: num(fd.get("opponent_score")),
                },
                form,
              );
            }}
          >
            <h2 className="text-2xl">Log match</h2>
            <div className="mt-4 space-y-3">
              <div>
                <Label htmlFor="m-team">Team</Label>
                <select
                  id="m-team"
                  name="team_id"
                  required
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select team…</option>
                  {myTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.clubs?.name} — {team.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="m-opponent-name">Opponent name</Label>
                <Input id="m-opponent-name" name="opponent_name" required placeholder="FC Example" />
              </div>
              <div>
                <Label htmlFor="m-opponent-club">Opponent club (if registered here)</Label>
                <select
                  id="m-opponent-club"
                  name="opponent_club_id"
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Not registered / unknown</option>
                  {myClubs.map((club) => (
                    <option key={club.id} value={club.id}>
                      {club.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="m-date">Date</Label>
                  <Input id="m-date" name="match_date" type="date" required />
                </div>
                <div>
                  <Label htmlFor="m-home-away">Home / away</Label>
                  <select
                    id="m-home-away"
                    name="home_away"
                    defaultValue="home"
                    className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="home">Home</option>
                    <option value="away">Away</option>
                    <option value="neutral">Neutral</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="m-team-score">Team score</Label>
                  <Input id="m-team-score" name="team_score" type="number" />
                </div>
                <div>
                  <Label htmlFor="m-opponent-score">Opponent score</Label>
                  <Input id="m-opponent-score" name="opponent_score" type="number" />
                </div>
              </div>
              <Button type="submit" disabled={saving || myTeams.length === 0} className="w-full">
                Save match
              </Button>
              <p className="text-xs text-muted-foreground">
                Add player ratings afterwards from the match page.
              </p>
            </div>
          </form>
        </div>

        <section className="mt-14">
          <h2 className="text-3xl">What you've added</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <MyList title={`Clubs (${myClubs.length})`}>
              {myClubs.map((club) => (
                <li key={club.id}>
                  <Link
                    to="/clubs/$clubId"
                    params={{ clubId: club.id }}
                    className="hover:text-primary"
                  >
                    {club.name}
                  </Link>
                </li>
              ))}
            </MyList>
            <MyList title={`Teams (${myTeams.length})`}>
              {myTeams.map((team) => (
                <li key={team.id}>
                  {team.clubs?.name} — {team.name}
                </li>
              ))}
            </MyList>
            <MyList title={`Players (${myPlayers.length})`}>
              {myPlayers.map((player) => (
                <li key={player.id}>
                  <Link
                    to="/players/$playerId"
                    params={{ playerId: player.id }}
                    className="hover:text-primary"
                  >
                    {player.full_name}
                  </Link>
                </li>
              ))}
            </MyList>
            <MyList title={`Matches (${myMatches.length})`}>
              {myMatches.map((match) => (
                <li key={match.id}>
                  <Link
                    to="/matches/$matchId"
                    params={{ matchId: match.id }}
                    className="hover:text-primary"
                  >
                    {match.teams?.clubs?.name ?? match.teams?.name} {match.team_score ?? "–"}–{match.opponent_score ?? "–"}{" "}
                    {match.opponent_club?.name ?? match.opponent_name}
                  </Link>
                </li>
              ))}
            </MyList>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function MyList({ title, children }: { title: string; children: React.ReactNode }) {
  const hasItems = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-card">
      <h3 className="text-xl">{title}</h3>
      {hasItems ? (
        <ul className="mt-3 space-y-2 text-sm">{children}</ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Nothing here yet.</p>
      )}
    </div>
  );
}
