import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { listPlayers, listClubs } from "@/lib/grassroots.functions";
import { ClubLogo } from "@/components/ClubLogo";
import { useLanguage } from "@/lib/i18n";

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/** Header search: jump straight to any player or club from anywhere on the site. */
export function GlobalSearch() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query.trim(), 250);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const hasQuery = debounced.length > 0;
  const { data: players, isFetching: playersLoading } = useQuery({
    queryKey: ["search-players", debounced],
    queryFn: () => listPlayers({ data: { q: debounced } }),
    enabled: open && hasQuery,
  });
  const { data: clubs, isFetching: clubsLoading } = useQuery({
    queryKey: ["search-clubs", debounced],
    queryFn: () => listClubs({ data: { q: debounced } }),
    enabled: open && hasQuery,
  });

  const playerResults = (players ?? []).slice(0, 5);
  const clubResults = (clubs ?? []).slice(0, 5);
  const isLoading = playersLoading || clubsLoading;
  const hasResults = playerResults.length > 0 || clubResults.length > 0;

  function close() {
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("nav.search")}
        className="flex items-center gap-2 rounded border border-pitch-foreground/25 bg-pitch-foreground/5 px-2.5 py-1.5 opacity-90 transition-opacity hover:bg-pitch-foreground/10 hover:opacity-100"
      >
        <Search className="size-4" aria-hidden="true" />
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-lg border border-border bg-card text-foreground shadow-card sm:w-80">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("nav.searchPlaceholder")}
              className="w-full bg-transparent text-sm focus:outline-none"
            />
            {query ? (
              <button type="button" onClick={() => setQuery("")} aria-label={t("nav.searchClear")}>
                <X className="size-4 text-muted-foreground" aria-hidden="true" />
              </button>
            ) : null}
          </div>

          {hasQuery ? (
            <div className="max-h-80 overflow-y-auto">
              {isLoading && !hasResults ? (
                <p className="px-4 py-4 text-sm text-muted-foreground">{t("nav.searching")}</p>
              ) : !hasResults ? (
                <p className="px-4 py-4 text-sm text-muted-foreground">{t("nav.noSearchResults")}</p>
              ) : (
                <>
                  {playerResults.length > 0 ? (
                    <div>
                      <p className="label-caps bg-secondary px-4 py-2 text-secondary-foreground">{t("nav.players")}</p>
                      <ul className="divide-y divide-border">
                        {playerResults.map((player) => (
                          <li key={player.id}>
                            <Link
                              to="/players/$playerId"
                              params={{ playerId: player.id }}
                              onClick={close}
                              className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-muted/60"
                            >
                              <span className="truncate font-display text-base">{player.full_name}</span>
                              <span className="shrink-0 truncate text-xs text-muted-foreground">
                                {[player.clubs?.name, player.position].filter(Boolean).join(" · ")}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {clubResults.length > 0 ? (
                    <div>
                      <p className="label-caps bg-secondary px-4 py-2 text-secondary-foreground">{t("nav.clubs")}</p>
                      <ul className="divide-y divide-border">
                        {clubResults.map((club) => (
                          <li key={club.id}>
                            <Link
                              to="/clubs/$clubId"
                              params={{ clubId: club.id }}
                              onClick={close}
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60"
                            >
                              <ClubLogo name={club.name} url={club.logo_url} className="size-7" />
                              <span className="font-display text-base">{club.name}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
