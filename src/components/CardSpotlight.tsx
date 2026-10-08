import { useEffect } from "react";

/** Feeds the pointer position to hovered cards so their amber spotlight follows the mouse. */
export function CardSpotlight() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const card = (event.target as Element | null)?.closest<HTMLElement>(".lift");
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      card.style.setProperty("--my", `${event.clientY - rect.top}px`);
    };
    document.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => document.removeEventListener("pointermove", onPointerMove);
  }, []);
  return null;
}
