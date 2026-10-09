import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/GlobalSearch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";
import { InstallApp } from "@/components/InstallApp";
import { AlertsBell } from "@/components/AlertsBell";
import { MessagesLink } from "@/components/MessagesLink";
import { useLanguage } from "@/lib/i18n";
import type { Session } from "@supabase/supabase-js";

function NavItems() {
  const { t } = useLanguage();
  return (
    <>
      <Link to="/players" className="nav-link" activeProps={{ className: "is-active" }}>
        {t("nav.players")}
      </Link>
      <Link to="/clubs" className="nav-link" activeProps={{ className: "is-active" }}>
        {t("nav.clubs")}
      </Link>
      <Link to="/matches" className="nav-link" activeProps={{ className: "is-active" }}>
        {t("nav.matches")}
      </Link>
    </>
  );
}

export function SiteHeader() {
  const [session, setSession] = useState<Session | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="vt-header sticky top-0 z-40 border-b border-border bg-pitch text-pitch-foreground pitch-stripes">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Logo />
        <nav className="hidden gap-6 sm:flex">
          <NavItems />
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <GlobalSearch />
          {session ? <MessagesLink /> : null}
          {session ? <AlertsBell /> : null}
          <ThemeToggle />
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
      <nav className="flex gap-7 border-t border-pitch-foreground/15 px-4 py-2 sm:hidden">
        <NavItems />
      </nav>
    </header>
  );
}

export function SiteFooter() {
  const { t } = useLanguage();
  return (
    <footer className="mt-20 border-t border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm text-muted-foreground">
        <Logo boxed className="w-fit text-foreground" />
        <p>{t("footer.text")}</p>
        <nav className="flex gap-4 text-xs">
          <Link to="/terms" className="underline hover:text-foreground">
            {t("footer.terms")}
          </Link>
          <Link to="/privacy" className="underline hover:text-foreground">
            {t("footer.privacy")}
          </Link>
        </nav>
        <InstallApp />
      </div>
    </footer>
  );
}
