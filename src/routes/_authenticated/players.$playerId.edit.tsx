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
import { COUNTRIES, flagEmoji } from "@/lib/flags";

export const Route = createFileRoute("/_authenticated/players/$playerId/edit")({
  component: EditPlayerPage,
});

type FormState = {
  full_name: string;
  position: string;
  birth_year: string;
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
      toast.error("Namn måste fyllas i.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("players")
      .update({
        full_name: form.full_name.trim(),
        position: str(form.position),
        birth_year: num(form.birth_year),
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
      toast.error("Kunde inte spara: " + error.message);
      return;
    }
    await queryClient.invalidateQueries();
    toast.success("Spelaren är uppdaterad.");
    navigate({ to: "/players/$playerId", params: { playerId } });
  }

  async function handleDelete() {
    if (!window.confirm("Ta bort spelaren permanent?")) return;
    const { error } = await supabase.from("players").delete().eq("id", playerId);
    if (error) {
      toast.error("Kunde inte ta bort: " + error.message);
      return;
    }
    await queryClient.invalidateQueries();
    toast.success("Spelaren är borttagen.");
    navigate({ to: "/players" });
  }

  if (roleLoading || isLoading) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <p className="p-10 text-center text-sm text-muted-foreground">Laddar…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="text-3xl">Endast administratör</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Ditt konto har inte rätt att redigera den här spelaren.
          </p>
          <Link to="/players" className="mt-5 inline-block text-primary underline">
            Tillbaka till spelare
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
        <p className="p-10 text-center text-sm text-muted-foreground">Spelaren finns inte.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="label-caps text-muted-foreground">Redigera</p>
        <h1 className="mt-1 text-4xl">{player.full_name}</h1>

        <form onSubmit={handleSave} className="mt-8 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="full_name">Namn</Label>
            <Input id="full_name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="position">Position</Label>
            <Input id="position" value={form.position} onChange={(e) => set("position", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="shirt_number">Tröjnummer</Label>
            <Input id="shirt_number" inputMode="numeric" value={form.shirt_number} onChange={(e) => set("shirt_number", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="birth_year">Födelseår</Label>
            <Input id="birth_year" inputMode="numeric" value={form.birth_year} onChange={(e) => set("birth_year", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="height_cm">Längd (cm)</Label>
            <Input id="height_cm" inputMode="numeric" value={form.height_cm} onChange={(e) => set("height_cm", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="preferred_foot">Starkaste fot</Label>
            <Input id="preferred_foot" value={form.preferred_foot} onChange={(e) => set("preferred_foot", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="nationality">Nationalitet</Label>
            <Input id="nationality" value={form.nationality} onChange={(e) => set("nationality", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="flag_1">Flagga 1</Label>
            <select
              id="flag_1"
              value={form.flag_1}
              onChange={(e) => set("flag_1", e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Ingen flagga</option>
              {COUNTRIES.map((country) => (
                <option key={country.code} value={country.code}>
                  {flagEmoji(country.code)} {country.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="flag_2">Flagga 2 (valfri)</Label>
            <select
              id="flag_2"
              value={form.flag_2}
              onChange={(e) => set("flag_2", e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Ingen flagga</option>
              {COUNTRIES.map((country) => (
                <option key={country.code} value={country.code}>
                  {flagEmoji(country.code)} {country.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="club_id">Klubb</Label>
            <select
              id="club_id"
              value={form.club_id}
              onChange={(e) => {
                set("club_id", e.target.value);
                set("team_id", "");
              }}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Ingen klubb</option>
              {(clubs ?? []).map((club) => (
                <option key={club.id} value={club.id}>
                  {club.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="team_id">Lag</Label>
            <select
              id="team_id"
              value={form.team_id}
              onChange={(e) => set("team_id", e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Inget lag</option>
              {(teams ?? []).map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="bio">Beskrivning</Label>
            <Textarea id="bio" rows={6} value={form.bio} onChange={(e) => set("bio", e.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <Button type="submit" variant="accent" disabled={saving}>
              {saving ? "Sparar…" : "Spara ändringar"}
            </Button>
            <Button asChild variant="outline" type="button">
              <Link to="/players/$playerId" params={{ playerId }}>
                Avbryt
              </Link>
            </Button>
            <Button type="button" variant="destructive" className="ml-auto" onClick={handleDelete}>
              Ta bort spelare
            </Button>
          </div>
        </form>

        <TransfersEditor playerId={playerId} clubs={clubs ?? []} />
      </main>
      <SiteFooter />
    </div>
  );
}

type ClubOption = { id: string; name: string };

const ORG_TYPE_LABELS: Record<string, string> = {
  club: "Klubb",
  school: "Skola",
  national: "Landslag",
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
    clubs.find((club) => club.id === id)?.name ?? fallback ?? "Okänd klubb";

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!fromClub && !toClub) {
      toast.error("Välj minst en klubb.");
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
      toast.error("Kunde inte lägga till övergången: " + error.message);
      return;
    }
    setFromClub("");
    setToClub("");
    setDate("");
    setType("");
    setOrgType("club");
    setNote("");
    await queryClient.invalidateQueries();
    toast.success("Övergången är tillagd.");
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Ta bort övergången?")) return;
    const { error } = await supabase.from("transfers").delete().eq("id", id);
    if (error) {
      toast.error("Kunde inte ta bort: " + error.message);
      return;
    }
    await queryClient.invalidateQueries();
    toast.success("Övergången är borttagen.");
  }

  return (
    <section className="mt-14">
      <h2 className="text-3xl">Övergångar</h2>
      {(transfers ?? []).length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Inga övergångar registrerade ännu.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
          {(transfers ?? []).map((transfer) => (
            <li key={transfer.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="label-caps w-28 text-muted-foreground">
                {transfer.transfer_date ?? "Okänt datum"}
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
                Ta bort
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="mt-6 grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="from_club">Från klubb</Label>
          <select
            id="from_club"
            value={fromClub}
            onChange={(e) => setFromClub(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Okänd / ingen</option>
            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="to_club">Till klubb</Label>
          <select
            id="to_club"
            value={toClub}
            onChange={(e) => setToClub(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Okänd / ingen</option>
            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="transfer_date">Datum</Label>
          <Input
            id="transfer_date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="org_type">Sorts period</Label>
          <select
            id="org_type"
            value={orgType}
            onChange={(e) => setOrgType(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="club">Klubbövergång</option>
            <option value="school">Skolperiod</option>
            <option value="national">Landslagsperiod</option>
          </select>
        </div>
        <div>
          <Label htmlFor="transfer_type">Typ (t.ex. Permanent, Lån)</Label>
          <Input id="transfer_type" value={type} onChange={(e) => setType(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="transfer_note">Notering</Label>
          <Textarea id="transfer_note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" variant="accent" disabled={busy}>
            {busy ? "Sparar…" : "Lägg till övergång"}
          </Button>
        </div>
      </form>
    </section>
  );
}
