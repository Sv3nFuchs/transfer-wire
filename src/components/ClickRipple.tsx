import { useEffect } from "react";

/** Drops a quick amber ring where you click buttons, tabs and cards (and, softer, where you hover player/club cards). */
export function ClickRipple() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest(".lift, button:not(:disabled), [role='tab']")) return;
      const ring = document.createElement("span");
      ring.className = "click-ripple";
      ring.style.left = `${event.clientX}px`;
      ring.style.top = `${event.clientY}px`;
      ring.addEventListener("animationend", () => ring.remove());
      document.body.appendChild(ring);
    };
    // A softer ring where the pointer first enters a player/club card or row.
    const onPointerOver = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const target = event.target as Element | null;
      const item = target?.closest(".lift, [data-hover-ripple]");
      if (!item || item.contains(event.relatedTarget as Node | null)) return;
      const ring = document.createElement("span");
      ring.className = "click-ripple hover";
      ring.style.left = `${event.clientX}px`;
      ring.style.top = `${event.clientY}px`;
      ring.addEventListener("animationend", () => ring.remove());
      document.body.appendChild(ring);
    };
    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("pointerover", onPointerOver, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointerover", onPointerOver);
    };
  }, []);
  return null;
}
