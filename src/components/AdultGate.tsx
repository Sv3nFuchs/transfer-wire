import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/i18n";
import { useEnableMessaging } from "@/lib/messages";

/** Turns messaging on: needs a display name and a confirmation that the person is 18 or older. */
export function AdultGate({ onDone }: { onDone?: () => void }) {
  const { t } = useLanguage();
  const enable = useEnableMessaging();
  const [name, setName] = useState("");
  const [adult, setAdult] = useState(false);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    enable.mutate(name, {
      onSuccess: () => {
        toast.success(t("messages.enabled"));
        onDone?.();
      },
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("messages.adultsOnly")}</p>
      <div>
        <Label htmlFor="msg-name">{t("messages.displayName")}</Label>
        <Input
          id="msg-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t("messages.displayNamePlaceholder")}
          minLength={2}
          maxLength={60}
          required
        />
        <p className="mt-1 text-xs text-muted-foreground">{t("messages.displayNameHelp")}</p>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={adult} onChange={(event) => setAdult(event.target.checked)} className="mt-1" />
        <span>{t("messages.confirmAdult")}</span>
      </label>
      <Button type="submit" disabled={!adult || name.trim().length < 2 || enable.isPending}>
        {t("messages.turnOn")}
      </Button>
    </form>
  );
}
