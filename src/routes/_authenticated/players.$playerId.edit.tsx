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
      </main>
      <SiteFooter />
    </div>
  );
}
