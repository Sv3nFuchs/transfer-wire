/** Players under 18 (or with no birth year on record) are kept out of search engines. */
export function isIndexablePlayer(birthYear: number | null | undefined, now = new Date()) {
  return birthYear != null && now.getFullYear() - birthYear >= 18;
}

/** A <script type="application/ld+json"> entry for a route's head(). */
export function jsonLd(data: Record<string, unknown>) {
  return {
    type: "application/ld+json",
    children: JSON.stringify({ "@context": "https://schema.org", ...data }),
  };
}
