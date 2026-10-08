import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n";

type InstallEvent = Event & { prompt: () => Promise<void> };

/** "Install the app" button (Chrome/Android) or a how-to line (iPhone/iPad Safari). */
export function InstallApp() {
  const { t } = useLanguage();
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;
    setHidden(false);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
    };
    const onInstalled = () => setHidden(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (hidden) return null;
  if (event) {
    return (
      <button
        type="button"
        onClick={() => {
          void event.prompt();
          setEvent(null);
        }}
        className="w-fit rounded-md border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
      >
        {t("footer.install")}
      </button>
    );
  }
  return ios ? <p className="text-xs">{t("footer.installIos")}</p> : null;
}
