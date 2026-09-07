import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { COUNTRIES } from "@/lib/flags";
import { CountryFlag } from "@/components/CountryFlag";

export const Route = createFileRoute("/_authenticated/players/$playerId/edit")({
  component: EditPlayerPage,
});

type FormState = {
  full_name: string;
  position: string;
  birth_year: string;
  birthplace: string;
  birthplace_country_code: string;
  preferred_foot: string;
  height_cm: string;
  nationality: string;
  flag_1: string;
  flag_2: string;
  shirt_number: string;
  club_id: string;
  team_id: string;
  bio: string;
};

const emptyForm: FormState = {
  full_name: "",
  position: "",
  birth_year: "",
  birthplace: "",
  birthplace_country_code: "",
  preferred_foot: "",
  height_cm: "",
  nationality: "",
  flag_1: "",
  flag_2: "",
  shirt_number: "",
  club_id: "",
  team_id: "",
  bio: "",
};

function EditPlayerPage() {
  const { playerId } = Route.useParams();
  const { isAdmin, isLoading: roleLoading } = useIsAdmin();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data: player, isLoading } = useQuery({
    queryKey: ["player-edit", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("id", playerId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const { data: clubs } = useQuery({
    queryKey: ["clubs-options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clubs").select("id, name").order("name");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const { data: teams } = useQuery({
    queryKey: ["teams-options", form.club_id],
    enabled: Boolean(form.club_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name")
        .eq("club_id", form.club_id)
        .order("name");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!player) return;
    setForm({
      full_name: player.full_name ?? "",
      position: player.position ?? "",
      birth_year: player.birth_year ? String(player.birth_year) : "",
      birthplace: player.birthplace ?? "",
      birthplace_country_code: player.birthplace_country_code ?? "",
      preferred_foot: player.preferred_foot ?? "",
      height_cm: player.height_cm ? String(player.height_cm) : "",
      nationality: player.nationality ?? "",
      flag_1: player.flag_1 ?? "",
      flag_2: player.flag_2 ?? "",
      shirt_number: player.shirt_number ? String(player.shirt_number) : "",
      club_id: player.club_id ?? "",
      team_id: player.team_id ?? "",
      bio: player.bio ?? "",
    });
  }, [player]);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const num = (value: string) => (value.trim() === "" ? null : Number(value));
  const str = (value: string) => (value.trim() === "" ? null : value.trim());

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!form.full_name.trim()) {
      toast.error("Name must be filled in.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("players")
      .update({
        full_name: form.full_name.trim(),
        position: str(form.position),
        birth_year: num(form.birth_year),
        birthplace: str(form.birthplace),
        birthplace_country_code: str(form.birthplace_country_code),
        preferred_foot: str(form.preferred_foot),
        height_cm: num(form.height_cm),
        nationality: str(form.nationality),
        flag_1: str(form.flag_1),
        flag_2: str(form.flag_2),
        shirt_number: num(form.shirt_number),
        club_id: str(form.club_id),
        team_id: str(form.team_id),
        bio: str(form.bio),
      })
      .eq("id", playerId);
    setSaving(false);
    if (error) {
      toast.error("Could not save: " + error.message);
      return;
    }
    await queryClient.invalidateQueries();
    toast.success("Player updated.");
    navigate({ to: "/players/$playerId", params: { playerId } });
  }

  async function handleDelete() {
    if (!window.confirm("Delete the player permanently?")) return;
    const { error } = await supabase.from("players").delete().eq("id", playerId);
    if (error) {
      toast.error("Could not delete: " + error.message);
      return;
    }
    await queryClient.invalidateQueries();
    toast.success("Player deleted.");
    navigate({ to: "/players" });
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
          <p className="mt-3 text-sm text-muted-foreground">
            Your account doesn't have permission to edit this player.
          </p>
          <Link to="/players" className="mt-5 inline-block text-primary underline">
            Back to players
          </Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <p className="p-10 text-center text-sm text-muted-foreground">The player doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="label-caps text-muted-foreground">Edit</p>
        <h1 className="mt-1 text-4xl">{player.full_name}</h1>

        <form onSubmit={handleSave} className="mt-8 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="full_name">Name</Label>
            <Input id="full_name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="position">Position</Label>
            <Input id="position" value={form.position} onChange={(e) => set("position", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="shirt_number">Shirt number</Label>
            <Input id="shirt_number" inputMode="numeric" value={form.shirt_number} onChange={(e) => set("shirt_number", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="birth_year">Birth year</Label>
            <Input id="birth_year" inputMode="numeric" value={form.birth_year} onChange={(e) => set("birth_year", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="birthplace">Place of birth</Label>
            <Input id="birthplace" value={form.birthplace} onChange={(e) => set("birthplace", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="birthplace_country_code">Country of birth</Label>
            <div className="mt-1 flex items-center gap-3">
              <CountryFlag code={form.birthplace_country_code} className="h-6 w-9" />
              <select
                id="birthplace_country_code"
                value={form.birthplace_country_code}
                onChange={(e) => set("birthplace_country_code", e.target.value)}
                className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">No country</option>
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>{country.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Label htmlFor="height_cm">Height (cm)</Label>
            <Input id="height_cm" inputMode="numeric" value={form.height_cm} onChange={(e) => set("height_cm", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="preferred_foot">Preferred foot</Label>
            <Input id="preferred_foot" value={form.preferred_foot} onChange={(e) => set("preferred_foot", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="nationality">Nationality</Label>
            <Input id="nationality" value={form.nationality} onChange={(e) => set("nationality", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="flag_1">Flag 1</Label>
            <div className="mt-1 flex items-center gap-3">
              <CountryFlag code={form.flag_1} className="h-6 w-9" />
              <select id="flag_1" value={form.flag_1} onChange={(e) => set("flag_1", e.target.value)} className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">No flag</option>
                {COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label htmlFor="flag_2">Flag 2 (optional)</Label>
            <div className="mt-1 flex items-center gap-3">
              <CountryFlag code={form.flag_2} className="h-6 w-9" />
              <select id="flag_2" value={form.flag_2} onChange={(e) => set("flag_2", e.target.value)} className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">No flag</option>
                {COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label htmlFor="club_id">Club</Label>
            <select
              id="club_id"
              value={form.club_id}
              onChange={(e) => {
                set("club_id", e.target.value);
                set("team_id", "");
              }}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">No club</option>
              {(clubs ?? []).map((club) => (
                <option key={club.id} value={club.id}>
                  {club.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="team_id">Team</Label>
            <select
              id="team_id"
              value={form.team_id}
              onChange={(e) => set("team_id", e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">No team</option>
              {(teams ?? []).map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="bio">Description</Label>
            <Textarea id="bio" rows={6} value={form.bio} onChange={(e) => set("bio", e.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <Button type="submit" variant="accent" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button asChild variant="outline" type="button">
              <Link to="/players/$playerId" params={{ playerId }}>
                Cancel
              </Link>
            </Button>
            <Button type="button" variant="destructive" className="ml-auto" onClick={handleDelete}>
              Delete player
            </Button>
          </div>
        </form>

        <TransfersEditor playerId={playerId} clubs={clubs ?? []} />
        <PastTeamsEditor playerId={playerId} />
      </main>
      <SiteFooter />
    </div>
  );
}

type ClubOption = { id: string; name: string };

const ORG_TYPE_LABELS: Record<string, string> = {
  club: "Club",
  school: "School",
  national: "National team",
};

function TransfersEditor({ playerId, clubs }: { playerId: string; clubs: ClubOption[] }) {
  const queryClient = useQueryClient();
  const [fromClub, setFromClub] = useState("");
  const [toClub, setToClub] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState("");
  const [orgType, setOrgType] = useState("club");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: transfers } = useQuery({
    queryKey: ["transfers-edit", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transfers")
        .select(
          "id, transfer_date, transfer_type, note, org_type, from_club_id, to_club_id, from_club_name, to_club_name",
        )
        .eq("player_id", playerId)
        .order("transfer_date", { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const clubName = (id: string | null, fallback: string | null) =>
    clubs.find((club) => club.id === id)?.name ?? fallback ?? "Unknown club";

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!fromClub && !toClub) {
      toast.error("Select at least one club.");
      return;
    }
    setBusy(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("transfers").insert({
      player_id: playerId,
      from_club_id: fromClub || null,
      to_club_id: toClub || null,
      transfer_date: date || null,
      transfer_type: type.trim() || null,
      org_type: orgType,
      note: note.trim() || null,
      created_by: userData.user?.id ?? null,
    });
    setBusy(false);
    if (error) {
      toast.error("Could not add the transfer: " + error.message);
      return;
    }
    setFromClub("");
    setToClub("");
    setDate("");
    setType("");
    setOrgType("club");
    setNote("");
    await queryClient.invalidateQueries();
    toast.success("Transfer added.");
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete the transfer?")) return;
    const { error } = await supabase.from("transfers").delete().eq("id", id);
    if (error) {
      toast.error("Could not delete: " + error.message);
      return;
    }
    await queryClient.invalidateQueries();
    toast.success("Transfer deleted.");
  }

  return (
    <section className="mt-14">
      <h2 className="text-3xl">Transfers</h2>
      {(transfers ?? []).length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No transfers recorded yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
          {(transfers ?? []).map((transfer) => (
            <li key={transfer.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="label-caps w-28 text-muted-foreground">
                {transfer.transfer_date ?? "Unknown date"}
              </span>
              <span className="font-display text-lg">
                {clubName(transfer.from_club_id, transfer.from_club_name)}
              </span>
              <span className="text-accent">→</span>
              <span className="font-display text-lg">
                {clubName(transfer.to_club_id, transfer.to_club_name)}
              </span>
              <span className="rounded bg-secondary px-2 py-0.5 text-xs uppercase">
                {ORG_TYPE_LABELS[transfer.org_type ?? "club"] ?? transfer.org_type}
              </span>
              {transfer.transfer_type ? (
                <span className="rounded border border-border px-2 py-0.5 text-xs uppercase">
                  {transfer.transfer_type}
                </span>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={() => handleDelete(transfer.id)}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="mt-6 grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="from_club">From club</Label>
          <select
            id="from_club"
            value={fromClub}
            onChange={(e) => setFromClub(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Unknown / none</option>
            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="to_club">To club</Label>
          <select
            id="to_club"
            value={toClub}
            onChange={(e) => setToClub(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Unknown / none</option>
            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="transfer_date">Date</Label>
          <Input
            id="transfer_date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="org_type">Spell type</Label>
          <select
            id="org_type"
            value={orgType}
            onChange={(e) => setOrgType(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="club">Club transfer</option>
            <option value="school">School spell</option>
            <option value="national">National team spell</option>
          </select>
        </div>
        <div>
          <Label htmlFor="transfer_type">Type (e.g. Permanent, Loan)</Label>
          <Input id="transfer_type" value={type} onChange={(e) => setType(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="transfer_note">Note</Label>
          <Textarea id="transfer_note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" variant="accent" disabled={busy}>
            {busy ? "Saving…" : "Add transfer"}
          </Button>
        </div>
      </form>
    </section>
  );
}

type TeamOption = { id: string; name: string; season: string | null; league: string | null; clubs: { name: string } | null };

function PastTeamsEditor({ playerId }: { playerId: string }) {
  const queryClient = useQueryClient();
  const [teamId, setTeamId] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: allTeams } = useQuery({
    queryKey: ["all-teams-options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, season, league, clubs(name)")
        .order("name");
      if (error) throw new Error(error.message);
      return (data ?? []) as TeamOption[];
    },
  });

  const { data: memberships } = useQuery({
    queryKey: ["team-memberships-edit", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_memberships")
        .select("id, team_id, teams(id, name, season, league, clubs(name))")
        .eq("player_id", playerId);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const addableTeams = (allTeams ?? []).filter((team) => !(memberships ?? []).some((m) => m.team_id === team.id));

  async function handleAdd() {
    if (!teamId) return;
    setBusy(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("team_memberships").insert({
      player_id: playerId,
      team_id: teamId,
      created_by: userData.user?.id ?? null,
    });
    setBusy(false);
    if (error) {
      toast.error("Could not add: " + error.message);
      return;
    }
    setTeamId("");
    await queryClient.invalidateQueries();
    toast.success("Added to team.");
  }

  async function handleRemove(id: string) {
    const { error } = await supabase.from("team_memberships").delete().eq("id", id);
    if (error) {
      toast.error("Could not remove: " + error.message);
      return;
    }
    await queryClient.invalidateQueries();
    toast.success("Removed.");
  }

  return (
    <section className="mt-14">
      <h2 className="text-3xl">Past teams</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Shows this player was part of a team's roster without needing a logged match — useful for past seasons you
        don't want to back-fill fixtures for.
      </p>
      {(memberships ?? []).length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No past teams recorded yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
          {(memberships ?? []).map((membership) => (
            <li key={membership.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              {membership.teams?.season ? (
                <span className="label-caps w-16 text-muted-foreground">{membership.teams.season}</span>
              ) : null}
              <span className="font-display text-lg">
                {membership.teams?.clubs?.name ? `${membership.teams.clubs.name} — ` : ""}
                {membership.teams?.name}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={() => handleRemove(membership.id)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Add a team…</option>
          {addableTeams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.clubs?.name ? `${team.clubs.name} — ` : ""}
              {team.name}
              {team.season ? ` (${team.season})` : ""}
            </option>
          ))}
        </select>
        <Button type="button" variant="accent" size="sm" disabled={!teamId || busy} onClick={handleAdd}>
          {busy ? "Adding…" : "Add"}
        </Button>
      </div>
    </section>
  );
}
