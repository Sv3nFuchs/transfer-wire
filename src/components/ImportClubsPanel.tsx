import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { importEverysportClubs } from "@/lib/import-everysport.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Admin tool: add every club from Everysport league or team pages. */
export function ImportClubsPanel() {
  const queryClient = useQueryClient();
  const [urls, setUrls] = useState("");
  const [level, setLevel] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  async function handleImport() {
    const list = urls
      .split(/\s+/)
      .map((value) => value.trim())
      .filter(Boolean);
    if (list.length === 0) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      toast.error("You need to be logged in.");
      return;
    }
    setBusy(true);
    setLog([]);
    let added = 0;
    for (const url of list) {
      try {
        const result = await importEverysportClubs({
          data: { url, level: level.trim() || undefined },
          headers: { Authorization: `Bearer ${token}` },
        });
        added += result.created;
        setLog((prev) => [
          ...prev,
          `${result.level ?? "Unknown level"}: ${result.created} added, ${result.linked} linked to existing, ${result.existing} already imported (of ${result.total}).`,
        ]);
      } catch (error) {
        setLog((prev) => [...prev, `${url} — ${error instanceof Error ? error.message : String(error)}`]);
      }
    }
    await queryClient.invalidateQueries();
    setBusy(false);
    toast.success(`Import finished — ${added} new club${added === 1 ? "" : "s"}.`);
  }

  return (
    <details className="mt-6 rounded-lg border border-border bg-card p-5 shadow-card">
      <summary className="cursor-pointer font-display text-xl">Import clubs from Everysport</summary>
      <p className="mt-3 text-sm text-muted-foreground">
        Paste Everysport league or team page URLs, one per line. Every club in that league is added with its logo
        and level; clubs you already have are matched, not duplicated.
      </p>
      <div className="mt-4 grid gap-4">
        <div>
          <Label htmlFor="import_urls">Everysport URLs</Label>
          <Textarea
            id="import_urls"
            rows={4}
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            placeholder="https://www.everysport.com/fotboll-herr/liga/allsvenskan/…"
          />
        </div>
        <div>
          <Label htmlFor="import_level">Level (optional — detected from the league if left blank)</Label>
          <Input id="import_level" value={level} onChange={(e) => setLevel(e.target.value)} />
        </div>
        <div>
          <Button type="button" variant="accent" disabled={busy || !urls.trim()} onClick={handleImport}>
            {busy ? "Importing…" : "Import clubs"}
          </Button>
        </div>
        {log.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {log.map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </details>
  );
}
