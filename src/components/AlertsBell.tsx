import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ClubLogo } from "@/components/ClubLogo";
import { formatDateInLang, useLanguage } from "@/lib/i18n";
import { useAlerts, useMarkAlertsRead } from "@/lib/alerts";
import type { AlertEvent } from "@/lib/alerts.functions";

const KIND_LABEL = { result: "alerts.result", fixture: "alerts.fixture", rating: "alerts.rating" } as const;

export function AlertRow({ event }: { event: AlertEvent }) {
  const { t } = useLanguage();
  return (
    <Link
      to="/matches/$matchId"
      params={{ matchId: event.matchId }}
      className="flex items-start gap-3 rounded-md p-2 transition-colors hover:bg-muted"
    >
      <ClubLogo name={event.title} url={event.logo} className="size-8" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="label-caps text-[0.7rem]">{t(KIND_LABEL[event.kind])}</span>
          {event.unread ? <span className="size-2 rounded-full bg-accent" aria-label={t("alerts.unread")} /> : null}
        </span>
        <span className="block truncate font-display text-lg leading-tight">{event.title}</span>
        <span className="block text-xs text-muted-foreground">
          {event.kind === "rating" ? `${event.detail} · ` : ""}
          {formatDateInLang(event.date, "—")}
        </span>
      </span>
    </Link>
  );
}

/** Header bell: unread count, latest alerts, mark-all-read. Only rendered for signed-in users. */
export function AlertsBell() {
  const { t } = useLanguage();
  const { data } = useAlerts();
  const markRead = useMarkAlertsRead();
  const unread = data?.unreadCount ?? 0;
  const latest = (data?.events ?? []).slice(0, 6);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("alerts.title")}
          title={t("alerts.title")}
          className="relative grid size-9 place-items-center rounded-md border border-pitch-foreground/30 text-pitch-foreground transition-colors hover:bg-pitch-foreground/10"
        >
          <Bell className="size-4" />
          {unread > 0 ? (
            <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[0.7rem] font-medium leading-5 text-accent-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] max-w-[calc(100vw-1.5rem)] p-2">
        <div className="flex items-center justify-between px-2 py-1">
          <p className="font-display text-xl uppercase">{t("alerts.title")}</p>
          {unread > 0 ? (
            <button
              type="button"
              className="text-xs text-primary underline"
              onClick={() => markRead.mutate((data?.events ?? []).filter((e) => e.unread).map((e) => e.key))}
            >
              {t("alerts.markRead")}
            </button>
          ) : null}
        </div>
        {latest.length === 0 ? (
          <p className="px-2 py-4 text-sm text-muted-foreground">{t("alerts.empty")}</p>
        ) : (
          <div className="grid gap-0.5">
            {latest.map((event) => (
              <AlertRow key={event.key} event={event} />
            ))}
          </div>
        )}
        <Link to="/following" className="mt-1 block rounded-md px-2 py-2 text-sm text-primary underline">
          {t("alerts.seeAll")}
        </Link>
      </PopoverContent>
    </Popover>
  );
}
