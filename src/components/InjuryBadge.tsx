import { Bandage } from "lucide-react";
import { formatDateInLang, useLanguage } from "@/lib/i18n";

/** Red "Injured" or amber "Doubtful" pill; renders nothing for fit players. */
export function InjuryBadge({ status, className = "" }: { status: string | null | undefined; className?: string }) {
  const { t } = useLanguage();
  if (status !== "injured" && status !== "doubtful") return null;
  const injured = status === "injured";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[0.7rem] font-medium leading-4 ${
        injured ? "bg-destructive text-destructive-foreground" : "bg-accent text-accent-foreground"
      } ${className}`}
    >
      <Bandage className="size-3" aria-hidden="true" />
      {injured ? t("injury.injured") : t("injury.doubtful")}
    </span>
  );
}

/** "Off injured at half time" / "Off injured · 63'" tag for a single match. */
export function OffInjuredTag({ minute, className = "" }: { minute: number | null | undefined; className?: string }) {
  const { t } = useLanguage();
  return (
    <span
      className={`inline-flex items-center gap-1 rounded bg-destructive/15 px-1.5 py-0.5 text-xs font-medium text-destructive ${className}`}
    >
      <Bandage className="size-3" aria-hidden="true" />
      {t("injury.offInjured")}
      {minute === 45 ? ` · ${t("injury.halfTime")}` : minute != null ? ` · ${minute}'` : ""}
    </span>
  );
}

type Notice = {
  injury_status: string | null;
  injury_note: string | null;
  injury_since: string | null;
  injury_expected_return: string | null;
};

/** Hero block with the status, the note and the dates. */
export function InjuryNotice({ player }: { player: Notice }) {
  const { t } = useLanguage();
  if (player.injury_status !== "injured" && player.injury_status !== "doubtful") return null;
  const details = [
    player.injury_since ? `${t("injury.since")} ${formatDateInLang(player.injury_since, "—")}` : null,
    player.injury_expected_return ? `${t("injury.expectedBack")} ${formatDateInLang(player.injury_expected_return, "—")}` : null,
  ].filter(Boolean);
  return (
    <div className="mt-4 max-w-xl rounded-md border border-pitch-foreground/25 bg-pitch-foreground/10 px-3 py-2 text-sm">
      <InjuryBadge status={player.injury_status} />
      {player.injury_note ? <p className="mt-1.5">{player.injury_note}</p> : null}
      {details.length > 0 ? <p className="mt-1 text-xs opacity-80">{details.join(" · ")}</p> : null}
    </div>
  );
}
