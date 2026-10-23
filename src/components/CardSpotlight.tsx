import { useEffect } from "react";

/** Largest tilt in degrees; wide/tall elements rotate less so their edges don't swing far. */
const MAX_TILT = { lift: 5, tilt: 10 };

/** Feeds the pointer position to hovered cards (spotlight + tilt) and to [data-parallax] stages (layer depth). */
export function CardSpotlight() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const target = event.target as Element | null;
      const stage = target?.closest<HTMLElement>("[data-parallax]");
      if (stage) {
        const box = stage.getBoundingClientRect();
        stage.style.setProperty("--px", ((event.clientX - box.left) / box.width * 2 - 1).toFixed(3));
        stage.style.setProperty("--py", ((event.clientY - box.top) / box.height * 2 - 1).toFixed(3));
      }
      const card = target?.closest<HTMLElement>(".lift, .tilt");
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      card.style.setProperty("--mx", `${x}px`);
      card.style.setProperty("--my", `${y}px`);
      const max = card.classList.contains("tilt") ? MAX_TILT.tilt : MAX_TILT.lift;
      const maxY = max * Math.min(1, 320 / rect.width);
      const maxX = max * Math.min(1, 240 / rect.height);
      card.style.setProperty("--ry", `${(x / rect.width - 0.5) * 2 * maxY}deg`);
      card.style.setProperty("--rx", `${-(y / rect.height - 0.5) * 2 * maxX}deg`);
    };
    document.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => document.removeEventListener("pointermove", onPointerMove);
  }, []);
  return null;
}
