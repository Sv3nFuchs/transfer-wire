import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";

type Point = { x: number; y: number };

const SWAY_DEG = 14;
const IDLE_MS = 5000;

function Marker({ point, small = false }: { point: Point; small?: boolean }) {
  const position: CSSProperties = { left: `${point.x}%`, top: `${point.y}%` };
  return (
    <>
      {small ? null : (
        <div className="pitch3d__anchor" style={position}>
          <span className="pitch3d__ring" />
        </div>
      )}
      <div className="pitch3d__anchor" style={position}>
        <div className={`pitch3d__upright ${small ? "pitch3d__mark--small" : ""}`}>
          <span className="pitch3d__stem" />
          <span className="pitch3d__head" />
        </div>
      </div>
    </>
  );
}

/**
 * A pitch lying in perspective with the player standing on it. It sways gently
 * until touched; drag (or use the arrow keys) to spin it, double-click to reset.
 */
export function Pitch3D({
  coords,
  secondary,
  label,
  hint,
}: {
  coords: Point | null;
  secondary: Point | null;
  label: string;
  hint: string;
}) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const state = useRef({ base: 0, dragging: false, startX: 0, startBase: 0, lastTouch: -Infinity, swayStart: 0 });

  const apply = (deg: number) => sceneRef.current?.style.setProperty("--spin", `${deg}deg`);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const s = state.current;
    let visible = true;
    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
    });
    observer.observe(scene);
    const tick = (now: number) => {
      if (visible && !document.hidden && !s.dragging && now - s.lastTouch > IDLE_MS) {
        if (s.swayStart === 0) s.swayStart = now;
        apply(s.base + Math.sin((now - s.swayStart) / 900) * SWAY_DEG);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  const touch = () => {
    state.current.lastTouch = performance.now();
    state.current.swayStart = 0;
  };

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    const s = state.current;
    s.base = parseFloat(event.currentTarget.style.getPropertyValue("--spin")) || 0;
    s.dragging = true;
    s.startX = event.clientX;
    s.startBase = s.base;
    event.currentTarget.dataset["dragging"] = "true";
    event.currentTarget.setPointerCapture(event.pointerId);
    touch();
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const s = state.current;
    if (!s.dragging) return;
    s.base = s.startBase + (event.clientX - s.startX) * 0.6;
    apply(s.base);
    touch();
  }

  function onPointerEnd(event: PointerEvent<HTMLDivElement>) {
    state.current.dragging = false;
    delete event.currentTarget.dataset["dragging"];
    touch();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.key === "ArrowLeft" ? -12 : event.key === "ArrowRight" ? 12 : 0;
    if (!step) return;
    event.preventDefault();
    state.current.base += step;
    apply(state.current.base);
    touch();
  }

  function reset() {
    state.current.base = 0;
    apply(0);
    touch();
  }

  return (
    <div>
      <div
        ref={sceneRef}
        className="pitch3d"
        role="img"
        aria-label={`${label}. ${hint}.`}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onKeyDown={onKeyDown}
        onDoubleClick={reset}
      >
        <div className="pitch3d__plane">
          <div className="pitch3d__shadow" />
          <div className="pitch3d__slab" />
          <svg viewBox="0 0 100 100" className="pitch3d__surface pitch-stripes" aria-hidden="true">
            <rect x="4" y="2" width="92" height="96" fill="none" stroke="white" strokeOpacity="0.4" strokeWidth="0.6" />
            <line x1="4" y1="50" x2="96" y2="50" stroke="white" strokeOpacity="0.4" strokeWidth="0.6" />
            <circle cx="50" cy="50" r="9" fill="none" stroke="white" strokeOpacity="0.4" strokeWidth="0.6" />
            <rect x="26" y="2" width="48" height="16" fill="none" stroke="white" strokeOpacity="0.4" strokeWidth="0.6" />
            <rect x="38" y="2" width="24" height="7" fill="none" stroke="white" strokeOpacity="0.4" strokeWidth="0.6" />
            <rect x="26" y="82" width="48" height="16" fill="none" stroke="white" strokeOpacity="0.4" strokeWidth="0.6" />
            <rect x="38" y="91" width="24" height="7" fill="none" stroke="white" strokeOpacity="0.4" strokeWidth="0.6" />
          </svg>
          <div className="pitch3d__goal" style={{ top: "2%" }} />
          <div className="pitch3d__goal" style={{ top: "98%" }} />
          {secondary ? <Marker point={secondary} small /> : null}
          {coords ? <Marker point={coords} /> : null}
        </div>
      </div>
      <p className="label-caps mt-1 text-center">{hint}</p>
    </div>
  );
}
