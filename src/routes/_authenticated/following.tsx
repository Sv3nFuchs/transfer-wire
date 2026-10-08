import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { ClubLogo } from "@/components/ClubLogo";
import { PlayerPhoto } from "@/components/PlayerPhoto";
import { AlertRow } from "@/components/AlertsBell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAlerts, useMarkAlertsRead } from "@/lib/alerts";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/following")({
  head: () => ({ meta: [{ title: "Following — TransferWire" }, { name: "robots", content: "noindex" }] }),
  component: FollowingPage,
});

function FollowingPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data, isLoading } = useAlerts();
  const markRead = useMarkAlertsRead();

  const unfollow = async (type: "club" | "team" | "player", id: string) => {
    await supabase.from("follows").delete().eq("target_type", type).eq("target_id", id);
    void queryClient.invalidateQueries({ queryKey: ["alerts"] });
    void queryClient.invalidateQueries({ queryKey: ["follow", type, id] });
  };

  const events = data?.events ?? [];
  const following = data?.following;
  const nothingFollowed = !following || following.clubs.length + following.teams.length + following.players.length === 0;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-4xl">{t("alerts.followingTitle")}</h1>

        <div className="mt-8 grid gap-10 lg:grid-cols-[3fr_2fr]">
          <section>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl">{t("alerts.title")}</h2>
              {events.some((e) => e.unread) ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markRead.mutate(events.filter((e) => e.unread).map((e) => e.key))}
                >
                  {t("alerts.markRead")}
                </Button>
              ) : null}
            </div>
            {isLoading ? null : events.length === 0 ? (
              <p className="mt-4 max-w-md text-sm text-muted-foreground">
                {nothingFollowed ? t("alerts.empty") : t("alerts.quiet")}
              </p>
            ) : (
              <div className="mt-4 grid gap-2">
                {events.map((event) => (
                  <div key={event.key} className="rounded-lg border border-border bg-card shadow-card">
                    <AlertRow event={event} />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-2xl">{t("alerts.youFollow")}</h2>
            {nothingFollowed ? (
              <p className="mt-4 text-sm text-muted-foreground">{t("alerts.nothingYet")}</p>
            ) : (
              <ul className="mt-4 grid gap-2">
                {following.clubs.map((club) => (
                  <li key={club.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                    <ClubLogo name={club.name} url={club.logo_url} className="size-9" />
                    <Link to="/clubs/$clubId" params={{ clubId: club.id }} className="min-w-0 flex-1 truncate font-display text-lg hover:text-primary">
                      {club.name}
                    </Link>
                    <button type="button" className="text-xs text-primary underline" onClick={() => void unfollow("club", club.id)}>
                      {t("alerts.unfollow")}
                    </button>
                  </li>
                ))}
                {following.teams.map((team) => (
                  <li key={team.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                    <span className="min-w-0 flex-1 truncate font-display text-lg">
                      {[team.clubs?.name, team.name].filter(Boolean).join(" — ")}
                    </span>
                    <button type="button" className="text-xs text-primary underline" onClick={() => void unfollow("team", team.id)}>
                      {t("alerts.unfollow")}
                    </button>
                  </li>
                ))}
                {following.players.map((player) => (
                  <li key={player.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                    <PlayerPhoto name={player.full_name} url={player.photo_url} className="h-10 w-8" />
                    <Link to="/players/$playerId" params={{ playerId: player.id }} className="min-w-0 flex-1 truncate font-display text-lg hover:text-primary">
                      {player.full_name}
                    </Link>
                    <button type="button" className="text-xs text-primary underline" onClick={() => void unfollow("player", player.id)}>
                      {t("alerts.unfollow")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
