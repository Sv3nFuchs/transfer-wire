import { useEffect, useId, useRef } from "react";

type V3 = [number, number, number];

const PHI = (1 + Math.sqrt(5)) / 2;
const normalize = (v: V3): V3 => {
  const length = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / length, v[1] / length, v[2] / length];
};
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const lerp = (a: V3, b: V3, t: number): V3 =>
  normalize([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);

// A football is a truncated icosahedron: black pentagons sit on the 12 icosahedron
// vertices, and each corner lies a third of the way along an edge to a neighbour.
const VERTS: V3[] = [];
for (const a of [-1, 1]) {
  for (const b of [-1, 1]) {
    VERTS.push(normalize([0, a, b * PHI]), normalize([a, b * PHI, 0]), normalize([b * PHI, 0, a]));
  }
}
const NEIGHBOUR_DOT = 1 / Math.sqrt(5);
const neighboursOf = (index: number) =>
  VERTS.flatMap((other, j) => (j !== index && Math.abs(dot(VERTS[index]!, other) - NEIGHBOUR_DOT) < 0.01 ? [j] : []));

const PENTAGONS: V3[][] = VERTS.map((v, i) => {
  const up: V3 = Math.abs(v[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const e1 = normalize([v[1] * up[2] - v[2] * up[1], v[2] * up[0] - v[0] * up[2], v[0] * up[1] - v[1] * up[0]]);
  const e2: V3 = [v[1] * e1[2] - v[2] * e1[1], v[2] * e1[0] - v[0] * e1[2], v[0] * e1[1] - v[1] * e1[0]];
  return neighboursOf(i)
    .map((j) => ({ j, angle: Math.atan2(dot(VERTS[j]!, e2), dot(VERTS[j]!, e1)) }))
    .sort((a, b) => a.angle - b.angle)
    .map(({ j }) => lerp(v, VERTS[j]!, 1 / 3));
});

// Seams between hexagons: the middle third of each icosahedron edge.
const SEAMS: V3[][] = [];
VERTS.forEach((a, i) => {
  neighboursOf(i).forEach((j) => {
    if (j > i) SEAMS.push([lerp(a, VERTS[j]!, 1 / 3), lerp(a, VERTS[j]!, 0.5), lerp(a, VERTS[j]!, 2 / 3)]);
  });
});

const IDLE_SPIN = 0.55; // radians per second
const BASE_PITCH = -0.38;

/** Faux-3D football: real sphere geometry projected to SVG each frame, no 3D library. Drag to spin it. */
export function Football3D({ className = "" }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const wrapRef = useRef<HTMLDivElement>(null);
  const pentagonRefs = useRef<(SVGPolygonElement | null)[]>([]);
  const seamRefs = useRef<(SVGPolylineElement | null)[]>([]);
  const motion = useRef({ yaw: 0.6, pitch: BASE_PITCH, vYaw: IDLE_SPIN, vPitch: 0, dragging: false, lastX: 0, lastY: 0 });

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const m = motion.current;

    const project = (p: V3, cosY: number, sinY: number, cosP: number, sinP: number) => {
      const x1 = p[0] * cosY + p[2] * sinY;
      const z1 = -p[0] * sinY + p[2] * cosY;
      const y2 = p[1] * cosP - z1 * sinP;
      const z2 = p[1] * sinP + z1 * cosP;
      return { x: x1, y: -y2, z: z2 };
    };
    // Points on the far side are pushed to the rim so clipped patches don't fold back across the ball.
    const toPoint = (p: { x: number; y: number; z: number }) => {
      if (p.z >= 0) return `${p.x.toFixed(3)},${p.y.toFixed(3)}`;
      const length = Math.hypot(p.x, p.y) || 1;
      return `${(p.x / length).toFixed(3)},${(p.y / length).toFixed(3)}`;
    };

    const draw = () => {
      const cosY = Math.cos(m.yaw);
      const sinY = Math.sin(m.yaw);
      const cosP = Math.cos(m.pitch);
      const sinP = Math.sin(m.pitch);
      PENTAGONS.forEach((corners, i) => {
        const el = pentagonRefs.current[i];
        if (!el) return;
        const projected = corners.map((c) => project(c, cosY, sinY, cosP, sinP));
        const centreZ = projected.reduce((sum, p) => sum + p.z, 0) / projected.length;
        el.style.visibility = centreZ < -0.3 ? "hidden" : "visible";
        el.setAttribute("points", projected.map(toPoint).join(" "));
      });
      SEAMS.forEach((points, i) => {
        const el = seamRefs.current[i];
        if (!el) return;
        const projected = points.map((c) => project(c, cosY, sinY, cosP, sinP));
        el.style.visibility = projected[1]!.z < -0.05 ? "hidden" : "visible";
        el.setAttribute("points", projected.map(toPoint).join(" "));
      });
    };

    draw();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let last = performance.now();
    let visible = true;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
    });
    observer.observe(wrap);
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (visible && !document.hidden) {
        if (!m.dragging) {
          m.vYaw += (IDLE_SPIN - m.vYaw) * Math.min(1, dt * 1.6);
          m.vPitch *= 0.9;
          m.pitch += (BASE_PITCH - m.pitch) * Math.min(1, dt * 1.2) + m.vPitch * dt;
          m.yaw += m.vYaw * dt;
        }
        draw();
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const m = motion.current;
    m.dragging = true;
    m.lastX = event.clientX;
    m.lastY = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const m = motion.current;
    if (!m.dragging) return;
    const dx = event.clientX - m.lastX;
    const dy = event.clientY - m.lastY;
    m.lastX = event.clientX;
    m.lastY = event.clientY;
    m.yaw += dx * 0.012;
    m.pitch = Math.max(-1.1, Math.min(0.5, m.pitch + dy * 0.01));
    m.vYaw = dx * 0.7;
  };
  const onPointerEnd = () => {
    motion.current.dragging = false;
  };

  return (
    <div className={`football3d ${className}`} aria-hidden="true">
      <div className="football3d__shadow" />
      <div className="football3d__bounce">
        <div
          ref={wrapRef}
          className="football3d__ball"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
        >
          <svg viewBox="-1.04 -1.04 2.08 2.08" className="size-full">
            <defs>
              <radialGradient id={`${uid}-base`} cx="0.36" cy="0.3" r="0.85">
                <stop offset="0" stopColor="#ffffff" />
                <stop offset="0.6" stopColor="#ececec" />
                <stop offset="1" stopColor="#b4b6ba" />
              </radialGradient>
              <radialGradient id={`${uid}-shade`} cx="0.36" cy="0.3" r="0.82">
                <stop offset="0.45" stopColor="#000" stopOpacity="0" />
                <stop offset="1" stopColor="#0a1a10" stopOpacity="0.5" />
              </radialGradient>
              <radialGradient id={`${uid}-shine`} cx="0.3" cy="0.24" r="0.34">
                <stop offset="0" stopColor="#fff" stopOpacity="0.85" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </radialGradient>
              <clipPath id={`${uid}-clip`}>
                <circle r="1" />
              </clipPath>
            </defs>
            <circle r="1" fill={`url(#${uid}-base)`} />
            <g clipPath={`url(#${uid}-clip)`} strokeLinejoin="round">
              {SEAMS.map((_, i) => (
                <polyline
                  key={i}
                  ref={(el) => {
                    seamRefs.current[i] = el;
                  }}
                  fill="none"
                  stroke="#8d9096"
                  strokeWidth="0.022"
                  strokeLinecap="round"
                />
              ))}
              {PENTAGONS.map((_, i) => (
                <polygon
                  key={i}
                  ref={(el) => {
                    pentagonRefs.current[i] = el;
                  }}
                  fill="#17181c"
                  stroke="#17181c"
                  strokeWidth="0.02"
                />
              ))}
            </g>
            <circle r="1" fill={`url(#${uid}-shade)`} />
            <circle r="1" fill={`url(#${uid}-shine)`} />
          </svg>
        </div>
      </div>
    </div>
  );
}
