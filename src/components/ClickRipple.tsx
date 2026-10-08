import { useEffect } from "react";

/** Drops a quick amber ring where you click buttons, tabs and cards. */
export function ClickRipple() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest(".lift, .nav-link, button:not(:disabled), [role='tab']")) return;
      const ring = document.createElement("span");
      ring.className = "click-ripple";
      ring.style.left = `${event.clientX}px`;
      ring.style.top = `${event.clientY}px`;
      ring.addEventListener("animationend", () => ring.remove());
      document.body.appendChild(ring);
    };
    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);
  return null;
}
