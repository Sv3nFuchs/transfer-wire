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
import { CountryFlag } from "@/components/CountryFlag";
import { COUNTRIES, countryName } from "@/lib/flags";
import { syncEverysportFixtures } from "@/lib/import-everysport.functions";
import { syncTeamRoster } from "@/lib/import-roster.functions";

export const Route = createFileRoute("/_authenticated/clubs/$clubId/edit")({
  component: EditClubPage,
});

type FormState = {
  name: string;
  city: string;
  country_code: string;
  level: string;
  founded_year: string;
  description: string;
  everysport_id: string;
};

const emptyForm: FormState = {
  name: "",
  city: "",
  country_code: "SE",
  level: "",
  founded_year: "",
  description: "",
  everysport_id: "",
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
      toast.error("The file is too large (max 2 MB).");
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
      toast.error("Upload failed: " + error.message);
      return;
    }
    setLogoValue(path);
    setLogoPreview(await previewFor(path));
    toast.success("Logo uploaded — remember to save.");
  }

  const { data: club, isLoading } = useQuery({
    queryKey: ["club-edit", clubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select("*, teams(id, name, everysport_url, roster_url)")
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
      country_code: club.country_code ?? "SE",
      level: club.level ?? "",
      founded_year: club.founded_year ? String(club.founded_year) : "",
      description: club.description ?? "",
      everysport_id: club.everysport_id ?? "",
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
      toast.error("Club name must be filled in.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("clubs")
      .update({
        name: form.name.trim(),
        city: str(form.city),
        country: countryName(form.country_code),
        country_code: form.country_code,
        level: str(form.level),
        founded_year: form.founded_year.trim() === "" ? null : Number(form.founded_year),
        description: str(form.description),
        logo_url: str(logoValue),
        everysport_id: str(form.everysport_id),
      })
      .eq("id", clubId);
    setSaving(false);
    if (error) {
      toast.error("Could not save: " + error.message);
      return;
    }
    await queryClient.invalidateQueries();
    toast.success("Club updated.");
    navigate({ to: "/clubs/$clubId", params: { clubId } });
  }

  async function handleDeleteTeam(teamId: string) {
    if (!window.confirm("Delete the team? Players on the team will remain in the club.")) return;
    await supabase.from("players").update({ team_id: null }).eq("team_id", teamId);
    const { error } = await supabase.from("teams").delete().eq("id", teamId);
    if (error) {
      toast.error("Could not delete the team: " + error.message);
      return;
    }
    await queryClient.invalidateQueries();
    toast.success("Team deleted.");
  }

  async function handleDelete() {
    if (!window.confirm("Delete the club permanently? Teams and players in the club will also be deleted.")) return;
    const { error: playersError } = await supabase.from("players").delete().eq("club_id", clubId);
    if (playersError) {
      toast.error("Could not delete players: " + playersError.message);
      return;
    }
    const { error: teamsError } = await supabase.from("teams").delete().eq("club_id", clubId);
    if (teamsError) {
      toast.error("Could not delete teams: " + teamsError.message);
      return;
    }
    const { error } = await supabase.from("clubs").delete().eq("id", clubId);
    if (error) {
      toast.error("Could not delete the club: " + error.message);
      return;
    }
    await queryClient.invalidateQueries();
    toast.success("Club deleted.");
    navigate({ to: "/clubs" });
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
            Your account doesn't have permission to edit this club.
          </p>
          <Link to="/clubs" className="mt-5 inline-block text-primary underline">
            Back to clubs
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
        <p className="p-10 text-center text-sm text-muted-foreground">The club doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="label-caps text-muted-foreground">Edit club</p>
        <h1 className="mt-1 text-4xl">{club.name}</h1>

        <form onSubmit={handleSave} className="mt-8 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="name">Club name</Label>
            <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Input id="city" value={form.city} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="country">Country</Label>
            <div className="mt-1 flex items-center gap-3">
              <CountryFlag code={form.country_code} className="h-6 w-9" />
              <select
                id="country"
                value={form.country_code}
                onChange={(e) => set("country_code", e.target.value)}
                className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
              >
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Label htmlFor="level">Level</Label>
            <Input id="level" value={form.level} onChange={(e) => set("level", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="founded_year">Founded year</Label>
            <Input
              id="founded_year"
              inputMode="numeric"
              value={form.founded_year}
              onChange={(e) => set("founded_year", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="everysport_id">Everysport team ID (optional)</Label>
            <Input
              id="everysport_id"
              placeholder="e.g. 10587"
              value={form.everysport_id}
              onChange={(e) => set("everysport_id", e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              The number at the end of this club's everysport.com team URL. Lets fixture imports for
              other teams auto-link this club as their opponent.
            </p>
          </div>
          <div className="sm:col-span-2 rounded-lg border border-border p-4">
            <Label>Club logo</Label>
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
                  Upload an image (max 2 MB) or paste an image link from the web.
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
                  Remove logo
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
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={5}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <Button type="submit" variant="accent" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button asChild variant="outline" type="button">
              <Link to="/clubs/$clubId" params={{ clubId }}>
                Cancel
              </Link>
            </Button>
            <Button type="button" variant="destructive" className="ml-auto" onClick={handleDelete}>
              Delete club
            </Button>
          </div>
        </form>

        {club.teams && club.teams.length > 0 ? (
          <section className="mt-12">
            <h2 className="text-2xl">Teams in the club</h2>
            <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
              {club.teams.map((team) => (
                <TeamRow key={team.id} team={team} onDelete={() => handleDeleteTeam(team.id)} />
              ))}
            </ul>
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}

function TeamRow({
  team,
  onDelete,
}: {
  team: { id: string; name: string; everysport_url: string | null; roster_url: string | null };
  onDelete: () => void;
}) {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState(team.everysport_url ?? "");
  const [savingUrl, setSavingUrl] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [rosterUrl, setRosterUrl] = useState(team.roster_url ?? "");
  const [savingRosterUrl, setSavingRosterUrl] = useState(false);
  const [syncingRoster, setSyncingRoster] = useState(false);

  async function handleSaveUrl() {
    setSavingUrl(true);
    const { error } = await supabase
      .from("teams")
      .update({ everysport_url: url.trim() || null })
      .eq("id", team.id);
    setSavingUrl(false);
    if (error) {
      toast.error("Could not save URL: " + error.message);
      return;
    }
    await queryClient.invalidateQueries();
    toast.success("Everysport URL saved.");
  }

  async function handleSync() {
    setSyncing(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      toast.error("You need to be logged in.");
      setSyncing(false);
      return;
    }
    try {
      const result = await syncEverysportFixtures({
        data: { teamId: team.id },
        headers: { Authorization: `Bearer ${token}` },
      });
      await queryClient.invalidateQueries();
      const tableNote = result.tableRows > 0 ? ` League table updated (${result.tableRows} teams).` : "";
      toast.success(`Synced ${result.imported} match${result.imported === 1 ? "" : "es"}.${tableNote}`);
    } catch (error) {
      toast.error("Sync failed: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSyncing(false);
    }
  }

  async function handleSaveRosterUrl() {
    setSavingRosterUrl(true);
    const { error } = await supabase
      .from("teams")
      .update({ roster_url: rosterUrl.trim() || null })
      .eq("id", team.id);
    setSavingRosterUrl(false);
    if (error) {
      toast.error("Could not save URL: " + error.message);
      return;
    }
    await queryClient.invalidateQueries();
    toast.success("Roster URL saved.");
  }

  async function handleSyncRoster() {
    setSyncingRoster(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      toast.error("You need to be logged in.");
      setSyncingRoster(false);
      return;
    }
    try {
      const result = await syncTeamRoster({
        data: { teamId: team.id },
        headers: { Authorization: `Bearer ${token}` },
      });
      await queryClient.invalidateQueries();
      const skippedNote =
        result.skipped > 0
          ? ` ${result.skipped} name${result.skipped === 1 ? "" : "s"} not found in your database: ${result.skippedNames.slice(0, 5).join(", ")}${result.skippedNames.length > 5 ? "…" : ""}`
          : "";
      toast.success(`Linked ${result.linked} player${result.linked === 1 ? "" : "s"}.${skippedNote}`);
    } catch (error) {
      toast.error("Sync failed: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSyncingRoster(false);
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <span className="font-display text-lg">{team.name}</span>
      <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={onDelete}>
        Delete team
      </Button>
      <div className="flex w-full flex-wrap items-center gap-2 pt-1">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Everysport fixtures URL…"
          className="min-w-0 flex-1"
        />
        <Button type="button" variant="outline" size="sm" disabled={savingUrl} onClick={handleSaveUrl}>
          {savingUrl ? "Saving…" : "Save URL"}
        </Button>
        <Button type="button" variant="accent" size="sm" disabled={syncing || !url.trim()} onClick={handleSync}>
          {syncing ? "Syncing…" : "Sync fixtures"}
        </Button>
      </div>
      <div className="flex w-full flex-wrap items-center gap-2">
        <Input
          value={rosterUrl}
          onChange={(e) => setRosterUrl(e.target.value)}
          placeholder="Roster page URL (e.g. scores.cifss.org team roster)…"
          className="min-w-0 flex-1"
        />
        <Button type="button" variant="outline" size="sm" disabled={savingRosterUrl} onClick={handleSaveRosterUrl}>
          {savingRosterUrl ? "Saving…" : "Save URL"}
        </Button>
        <Button
          type="button"
          variant="accent"
          size="sm"
          disabled={syncingRoster || !rosterUrl.trim()}
          onClick={handleSyncRoster}
        >
          {syncingRoster ? "Syncing…" : "Sync roster"}
        </Button>
      </div>
    </li>
  );
}
