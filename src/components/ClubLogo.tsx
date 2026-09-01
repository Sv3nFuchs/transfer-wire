type ClubLogoProps = {
  name: string;
  url?: string | null;
  className?: string;
};

/** Club crest with a lettered fallback when no logo is set. */
export function ClubLogo({ name, url, className = "size-12" }: ClubLogoProps) {
  const initials = name
    .split(/\s+/)
    .filter((word) => /[a-zA-ZÀ-ÿ0-9]/.test(word))
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  if (url) {
    return (
      <img
        src={url}
        alt={`${name} klubbmärke`}
        loading="lazy"
        className={`${className} shrink-0 rounded bg-card object-contain`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${className} grid shrink-0 place-items-center rounded bg-secondary font-display text-lg text-secondary-foreground`}
    >
      {initials || "FC"}
    </span>
  );
}
