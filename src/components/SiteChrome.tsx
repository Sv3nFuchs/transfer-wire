import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import type { Session } from "@supabase/supabase-js";

export function SiteHeader() {
  const [session, setSession] = useState<Session | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-pitch text-pitch-foreground pitch-stripes">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="font-display text-2xl leading-none tracking-wide">Grassroots</span>
          <span className="rounded bg-accent px-1.5 py-0.5 font-display text-xs text-accent-foreground">
            FOOTBALL HUB
          </span>
        </Link>
        <nav className="hidden gap-5 sm:flex">
          <Link
            to="/players"
            className="font-display text-base tracking-wide opacity-80 transition-opacity hover:opacity-100"
            activeProps={{ className: "opacity-100 underline decoration-accent decoration-2" }}
          >
            {t("nav.players")}
          </Link>
          <Link
            to="/clubs"
            className="font-display text-base tracking-wide opacity-80 transition-opacity hover:opacity-100"
            activeProps={{ className: "opacity-100 underline decoration-accent decoration-2" }}
          >
            {t("nav.clubs")}
          </Link>
          <Link
            to="/matches"
            className="font-display text-base tracking-wide opacity-80 transition-opacity hover:opacity-100"
            activeProps={{ className: "opacity-100 underline decoration-accent decoration-2" }}
          >
            {t("nav.matches")}
          </Link>
          <Link
            to="/statistics"
            className="font-display text-base tracking-wide opacity-80 transition-opacity hover:opacity-100"
            activeProps={{ className: "opacity-100 underline decoration-accent decoration-2" }}
          >
            {t("nav.statistics")}
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {session ? (
            <Button asChild variant="accent" size="sm">
              <Link to="/dashboard">{t("nav.myPage")}</Link>
            </Button>
          ) : (
            <Button asChild variant="accent" size="sm">
              <Link to="/auth">{t("nav.login")}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const { t } = useLanguage();
  return (
    <footer className="mt-20 border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted-foreground">
        {t("footer.text")}
      </div>
    </footer>
  );
}
