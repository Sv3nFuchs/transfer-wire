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
import { ClubLogo } from "@/components/ClubLogo";

export const Route = createFileRoute("/_authenticated/clubs/$clubId/edit")({
  component: EditClubPage,
});

type FormState = {
  name: string;
  city: string;
  country: string;
  level: string;
  founded_year: string;
  description: string;
};

const emptyForm: FormState = {
  name: "",
  city: "",
  country: "",
  level: "",
  founded_year: "",
  description: "",
};

function EditClubPage() {
  const { clubId } = Route.useParams();
  const { isAdmin, isLoading: roleLoading } = useIsAdmin();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [logoValue, setLogoValue] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function previewFor(value: string) {
    if (!value) return null;
    if (/^https?:\/\//.test(value)) return value;
    const { data } = await supabase.storage.from("club-logos").createSignedUrl(value, 3600);
    return data?.signedUrl ?? null;
  }

  async function handleLogoFile(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Filen är för stor (max 2 MB).");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${clubId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("club-logos")
      .upload(path, file, { contentType: file.type, upsert: true });
    setUploading(false);
    if (error) {
      toast.error("Uppladdningen misslyckades: " + error.message);
      return;
    }
    setLogoValue(path);
    setLogoPreview(await previewFor(path));
    toast.success("Loggan är uppladdad — kom ihåg att spara.");
  }

  const { data: club, isLoading } = useQuery({
    queryKey: ["club-edit", clubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select("*, teams(id, name)")
        .eq("id", clubId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  useEffect(() => {
    if (!club) return;
    setForm({
      name: club.name ?? "",
      city: club.city ?? "",
      country: club.country ?? "",
      level: club.level ?? "",
      founded_year: club.founded_year ? String(club.founded_year) : "",
      description: club.description ?? "",
    });
    const stored = club.logo_url ?? "";
    setLogoValue(stored);
    void previewFor(stored).then(setLogoPreview);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [club]);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const str = (value: string) => (value.trim() === "" ? null : value.trim());

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error("Klubbnamn måste fyllas i.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("clubs")
      .update({
        name: form.name.trim(),
        city: str(form.city),
        country: form.country.trim() || "Sverige",
        level: str(form.level),
        founded_year: form.founded_year.trim() === "" ? null : Number(form.founded_year),
        description: str(form.description),
        logo_url: str(logoValue),
      })
      .eq("id", clubId);
    setSaving(false);
    if (error) {
      toast.error("Kunde inte spara: " + error.message);
      return;
    }
    await queryClient.invalidateQueries();
    toast.success("Klubben är uppdaterad.");
    navigate({ to: "/clubs/$clubId", params: { clubId } });
  }

  async function handleDeleteTeam(teamId: string) {
    if (!window.confirm("Ta bort laget? Spelare i laget blir kvar i klubben.")) return;
    await supabase.from("players").update({ team_id: null }).eq("team_id", teamId);
    const { error } = await supabase.from("teams").delete().eq("id", teamId);
    if (error) {
      toast.error("Kunde inte ta bort laget: " + error.message);
      return;
    }
    await queryClient.invalidateQueries();
    toast.success("Laget är borttaget.");
  }

  async function handleDelete() {
    if (!window.confirm("Ta bort klubben permanent? Lag och spelare i klubben tas också bort.")) return;
    const { error: playersError } = await supabase.from("players").delete().eq("club_id", clubId);
    if (playersError) {
      toast.error("Kunde inte ta bort spelare: " + playersError.message);
      return;
    }
    const { error: teamsError } = await supabase.from("teams").delete().eq("club_id", clubId);
    if (teamsError) {
      toast.error("Kunde inte ta bort lag: " + teamsError.message);
      return;
    }
    const { error } = await supabase.from("clubs").delete().eq("id", clubId);
    if (error) {
      toast.error("Kunde inte ta bort klubben: " + error.message);
      return;
    }
    await queryClient.invalidateQueries();
    toast.success("Klubben är borttagen.");
    navigate({ to: "/clubs" });
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
            Ditt konto har inte rätt att redigera den här klubben.
          </p>
          <Link to="/clubs" className="mt-5 inline-block text-primary underline">
            Tillbaka till klubbar
          </Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  if (!club) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <p className="p-10 text-center text-sm text-muted-foreground">Klubben finns inte.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="label-caps text-muted-foreground">Redigera klubb</p>
        <h1 className="mt-1 text-4xl">{club.name}</h1>

        <form onSubmit={handleSave} className="mt-8 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="name">Klubbnamn</Label>
            <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="city">Ort</Label>
            <Input id="city" value={form.city} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="country">Land</Label>
            <Input id="country" value={form.country} onChange={(e) => set("country", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="level">Nivå</Label>
            <Input id="level" value={form.level} onChange={(e) => set("level", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="founded_year">Grundad år</Label>
            <Input
              id="founded_year"
              inputMode="numeric"
              value={form.founded_year}
              onChange={(e) => set("founded_year", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2 rounded-lg border border-border p-4">
            <Label>Klubblogga</Label>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <ClubLogo name={form.name || "FC"} url={logoPreview} className="size-20" />
              <div className="flex flex-col gap-2">
                <input
                  id="logo-file"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleLogoFile(file);
                  }}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Ladda upp en bild (max 2 MB) eller klistra in en bildlänk från nätet.
                </p>
              </div>
              {logoValue ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setLogoValue("");
                    setLogoPreview(null);
                  }}
                >
                  Ta bort logga
                </Button>
              ) : null}
            </div>
            <Input
              className="mt-3"
              placeholder="https://…/logo.png"
              value={/^https?:\/\//.test(logoValue) ? logoValue : ""}
              onChange={(e) => {
                setLogoValue(e.target.value.trim());
                setLogoPreview(e.target.value.trim() || null);
              }}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="description">Beskrivning</Label>
            <Textarea
              id="description"
              rows={5}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <Button type="submit" variant="accent" disabled={saving}>
              {saving ? "Sparar…" : "Spara ändringar"}
            </Button>
            <Button asChild variant="outline" type="button">
              <Link to="/clubs/$clubId" params={{ clubId }}>
                Avbryt
              </Link>
            </Button>
            <Button type="button" variant="destructive" className="ml-auto" onClick={handleDelete}>
              Ta bort klubb
            </Button>
          </div>
        </form>

        {club.teams && club.teams.length > 0 ? (
          <section className="mt-12">
            <h2 className="text-2xl">Lag i klubben</h2>
            <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
              {club.teams.map((team) => (
                <li key={team.id} className="flex items-center gap-4 px-4 py-3">
                  <span className="font-display text-lg">{team.name}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="ml-auto"
                    onClick={() => handleDeleteTeam(team.id)}
                  >
                    Ta bort lag
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
