import { Link } from "@tanstack/react-router";
import { useEffect, useId } from "react";

const SHIELD = "M32 5 55 12.5V32C55 45.5 45 55 32 59 19 55 9 45.5 9 32V12.5Z";

/**
 * Crest shield with pitch stripes and a T. The outline draws in once per
 * session (html[data-intro="play"], set before paint by the root head script),
 * the stripes drift constantly, and the whole mark shines and tilts on hover.
 */
export function LogoMark({ className = "size-9", boxed = false }: { className?: string; boxed?: boolean }) {
  const clipId = useId();
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={`logo-mark ${className}`} fill="none">
      <defs>
        <clipPath id={clipId}>
          <path d={SHIELD} />
        </clipPath>
      </defs>
      <path
        d={SHIELD}
        style={{ fill: boxed ? "var(--pitch)" : "color-mix(in oklch, var(--pitch) 88%, white)" }}
      />
      <g clipPath={`url(#${clipId})`}>
        <g className="logo-stripes" fill="var(--chalk)" opacity="0.12">
          {[-27, -9, 9, 27, 45].map((x) => (
            <rect key={x} x={x} y="0" width="9" height="64" />
          ))}
        </g>
        <rect className="logo-shine" x="0" y="0" width="12" height="70" fill="var(--chalk)" />
      </g>
      <path
        className="logo-outline"
        pathLength={1}
        d={SHIELD}
        stroke="var(--accent)"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      <rect className="logo-bar" x="20" y="20" width="24" height="7" rx="1.5" fill="var(--accent)" />
      <rect className="logo-stem" x="28.5" y="27" width="7" height="20" rx="1.5" fill="var(--accent)" />
    </svg>
  );
}

/** Mark + wordmark, linking home. */
export function Logo({ className = "", boxed = false }: { className?: string; boxed?: boolean }) {
  useEffect(() => {
    // Let the intro finish, then stop it replaying on later page changes.
    const timer = window.setTimeout(() => {
      document.documentElement.dataset["intro"] = "done";
      try {
        sessionStorage.setItem("intro", "1");
      } catch {
        /* storage unavailable: the intro may replay next visit */
      }
    }, 2400);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <Link to="/" aria-label="TransferWire — home" className={`logo group flex items-center gap-2.5 ${className}`}>
      <LogoMark boxed={boxed} />
      <span className="flex flex-col gap-[3px]">
        <span className="font-display text-2xl uppercase leading-none tracking-wide">
          Transfer<span className={boxed ? "text-primary" : "text-accent"}>Wire</span>
        </span>
        <span className={`logo-cable ${boxed ? "text-primary" : "text-accent"}`} aria-hidden="true">
          <i />
          <b />
          <i />
          <em className="logo-spark" />
        </span>
      </span>
    </Link>
  );
}
