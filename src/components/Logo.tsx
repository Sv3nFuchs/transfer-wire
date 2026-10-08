import { Link } from "@tanstack/react-router";

/** A football circled by two "transfer" arrows. Colours follow the theme tokens. */
export function LogoMark({ className = "size-9", boxed = false }: { className?: string; boxed?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={`logo-mark ${className}`} fill="none">
      {boxed ? <rect width="64" height="64" rx="14" fill="var(--pitch)" /> : null}
      <g className="logo-arrows" stroke="var(--chalk)" strokeWidth="3.2" strokeLinecap="round">
        <path d="M10.75 26.3A22 22 0 0 1 37.7 10.75" />
        <path d="M53.25 37.7A22 22 0 0 1 26.3 53.25" />
        <path d="M42.5 12 38.6 7.4 36.8 14.1Z" fill="var(--chalk)" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M21.5 52 25.4 56.6 27.2 49.9Z" fill="var(--chalk)" strokeWidth="1.2" strokeLinejoin="round" />
      </g>
      <circle cx="32" cy="32" r="13" fill="var(--accent)" />
      <path
        d="M32 26.2 37.5 30.2 35.4 36.7H28.6L26.5 30.2Z"
        fill="var(--pitch)"
        stroke="var(--pitch)"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <path
        d="M32 26.2V19.4M37.5 30.2 43.9 28M35.4 36.7 39.4 42.3M28.6 36.7 24.6 42.3M26.5 30.2 20.1 28"
        stroke="var(--pitch)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Mark + wordmark, linking home. */
export function Logo({ className = "", boxed = false }: { className?: string; boxed?: boolean }) {
  return (
    <Link to="/" aria-label="TransferWire — home" className={`logo group flex items-center gap-2.5 ${className}`}>
      <LogoMark boxed={boxed} />
      <span className="flex items-baseline gap-2">
        <span className="font-display text-2xl leading-none tracking-wide">Transfer</span>
        <span className="rounded bg-accent px-1.5 py-0.5 font-display text-xs text-accent-foreground">WIRE</span>
      </span>
    </Link>
  );
}
