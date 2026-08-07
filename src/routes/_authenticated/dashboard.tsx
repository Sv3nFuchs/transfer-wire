import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Min sida — Gräsrot FC Data" },
      {
        name: "description",
        content: "Lägg in och hantera dina klubbar, lag och spelarprofiler i Gräsrot FC Data.",
      },
      { property: "og:title", content: "Min sida — Gräsrot FC Data" },
      {
        property: "og:description",
        content: "Hantera klubbar, lag och spelare du har registrerat.",
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
  return { clubs, teams, players };
}

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { clubs, teams, players } = useMyData();
  const [saving, setSaving] = useState(false);

  const myClubs = clubs.data ?? [];
  const myTeams = teams.data ?? [];
  const myPlayers = players.data ?? [];

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function submit(table: "clubs" | "teams" | "players", payload: Record<string, unknown>, form: HTMLFormElement) {
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
    toast.success("Sparat!");
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
          <h1 className="text-4xl">Min sida</h1>
          <Button onClick={handleSignOut} variant="outline" size="sm" className="ml-auto">
            Logga ut
          </Button>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Registrera klubb först, sedan lag, sedan spelare. Allt du lägger in blir direkt sökbart för
          alla besökare.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {/* Klubb */}
          <form
            className="rounded-lg border border-border bg-card p-5 shadow-card"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const fd = new FormData(form);
              void submit(
                "clubs",
                {
                  name: fd.get("name"),
                  country: fd.get("country") || "Sverige",
                  city: fd.get("city") || null,
                  level: fd.get("level") || null,
                  founded_year: num(fd.get("founded_year")),
                  description: fd.get("description") || null,
                },
                form,
              );
            }}
          >
            <h2 className="text-2xl">Ny klubb</h2>
            <div className="mt-4 space-y-3">
              <div>
                <Label htmlFor="club-name">Klubbnamn</Label>
                <Input id="club-name" name="name" required />
              </div>
              <div>
                <Label htmlFor="club-city">Ort</Label>
                <Input id="club-city" name="city" placeholder="Göteborg" />
              </div>
              <div>
                <Label htmlFor="club-country">Land</Label>
                <Input id="club-country" name="country" defaultValue="Sverige" />
              </div>
              <div>
                <Label htmlFor="club-level">Nivå</Label>
                <Input id="club-level" name="level" placeholder="Division 5 / Sunday League / U14" />
              </div>
              <div>
                <Label htmlFor="club-founded">Grundad</Label>
                <Input id="club-founded" name="founded_year" type="number" placeholder="1974" />
              </div>
              <div>
                <Label htmlFor="club-desc">Beskrivning</Label>
                <Textarea id="club-desc" name="description" rows={3} />
              </div>
              <Button type="submit" disabled={saving} className="w-full">
                Spara klubb
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
            <h2 className="text-2xl">Nytt lag</h2>
            <div className="mt-4 space-y-3">
              <div>
                <Label htmlFor="team-club">Klubb</Label>
                <select
                  id="team-club"
                  name="club_id"
                  required
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Välj klubb…</option>
                  {myClubs.map((club) => (
                    <option key={club.id} value={club.id}>
                      {club.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="team-name">Lagnamn</Label>
                <Input id="team-name" name="name" required placeholder="A-lag / U15 Boys" />
              </div>
              <div>
                <Label htmlFor="team-age">Åldersgrupp</Label>
                <Input id="team-age" name="age_group" placeholder="Senior, U15, U11" />
              </div>
              <div>
                <Label htmlFor="team-league">Liga / serie</Label>
                <Input id="team-league" name="league" placeholder="Div 6 Göteborg D" />
              </div>
              <div>
                <Label htmlFor="team-season">Säsong</Label>
                <Input id="team-season" name="season" placeholder="2026" />
              </div>
              <Button type="submit" disabled={saving || myClubs.length === 0} className="w-full">
                Spara lag
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
            <h2 className="text-2xl">Ny spelare</h2>
            <div className="mt-4 space-y-3">
              <div>
                <Label htmlFor="p-name">Namn</Label>
                <Input id="p-name" name="full_name" required />
              </div>
              <div>
                <Label htmlFor="p-club">Klubb</Label>
                <select
                  id="p-club"
                  name="club_id"
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Klubblös</option>
                  {myClubs.map((club) => (
                    <option key={club.id} value={club.id}>
                      {club.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="p-team">Lag</Label>
                <select
                  id="p-team"
                  name="team_id"
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Inget lag</option>
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
                  <Input id="p-pos" name="position" placeholder="Mittfält" />
                </div>
                <div>
                  <Label htmlFor="p-birth">Födelseår</Label>
                  <Input id="p-birth" name="birth_year" type="number" placeholder="2009" />
                </div>
                <div>
                  <Label htmlFor="p-foot">Fot</Label>
                  <Input id="p-foot" name="preferred_foot" placeholder="Höger" />
                </div>
                <div>
                  <Label htmlFor="p-height">Längd (cm)</Label>
                  <Input id="p-height" name="height_cm" type="number" />
                </div>
                <div>
                  <Label htmlFor="p-shirt">Tröjnummer</Label>
                  <Input id="p-shirt" name="shirt_number" type="number" />
                </div>
                <div>
                  <Label htmlFor="p-nat">Nationalitet</Label>
                  <Input id="p-nat" name="nationality" placeholder="Sverige" />
                </div>
              </div>
              <div>
                <Label htmlFor="p-bio">Om spelaren</Label>
                <Textarea id="p-bio" name="bio" rows={3} />
              </div>
              <Button type="submit" disabled={saving} className="w-full">
                Spara spelare
              </Button>
            </div>
          </form>
        </div>

        <section className="mt-14">
          <h2 className="text-3xl">Det du har lagt in</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <MyList title={`Klubbar (${myClubs.length})`}>
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
            <MyList title={`Lag (${myTeams.length})`}>
              {myTeams.map((team) => (
                <li key={team.id}>
                  {team.clubs?.name} — {team.name}
                </li>
              ))}
            </MyList>
            <MyList title={`Spelare (${myPlayers.length})`}>
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
        <p className="mt-3 text-sm text-muted-foreground">Inget här ännu.</p>
      )}
    </div>
  );
}
