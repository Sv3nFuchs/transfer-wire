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
        className="rounded p-1.5 opacity-80 transition-opacity hover:opacity-100"
      >
        <Search className="size-5" aria-hidden="true" />
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-lg border border-border bg-card text-foreground shadow-lift sm:w-80">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
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
            <div className="max-h-80 overflow-y-auto py-1">
              {isLoading && !hasResults ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">{t("nav.searching")}</p>
              ) : !hasResults ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">{t("nav.noSearchResults")}</p>
              ) : (
                <>
                  {playerResults.length > 0 ? (
                    <div>
                      <p className="label-caps px-4 pt-2 text-muted-foreground">{t("nav.players")}</p>
                      <ul>
                        {playerResults.map((player) => (
                          <li key={player.id}>
                            <Link
                              to="/players/$playerId"
                              params={{ playerId: player.id }}
                              onClick={close}
                              className="flex items-center justify-between gap-2 px-4 py-2 text-sm hover:bg-muted/60"
                            >
                              <span className="font-display">{player.full_name}</span>
                              <span className="truncate text-xs text-muted-foreground">
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
                      <p className="label-caps px-4 pt-2 text-muted-foreground">{t("nav.clubs")}</p>
                      <ul>
                        {clubResults.map((club) => (
                          <li key={club.id}>
                            <Link
                              to="/clubs/$clubId"
                              params={{ clubId: club.id }}
                              onClick={close}
                              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted/60"
                            >
                              <ClubLogo name={club.name} url={club.logo_url} className="size-5" />
                              {club.name}
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
