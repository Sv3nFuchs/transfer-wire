import { Link } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useMessagingProfile, useUnreadMessages } from "@/lib/messages";

/** Header envelope with an unread count; only shown once messaging is on. */
export function MessagesLink() {
  const { t } = useLanguage();
  const { data: me } = useMessagingProfile();
  const { data: unread = 0 } = useUnreadMessages(!!me?.profile);
  return (
    <Link
      to="/messages"
      aria-label={t("messages.title")}
      title={t("messages.title")}
      className="relative grid size-9 place-items-center rounded-md border border-pitch-foreground/30 text-pitch-foreground transition-colors hover:bg-pitch-foreground/10"
    >
      <Mail className="size-4" />
      {unread > 0 ? (
        <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[0.7rem] font-medium leading-5 text-accent-foreground">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
