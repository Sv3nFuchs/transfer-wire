/**
 * Maps a free-text position (e.g. "Center Back (Left Back)") to a spot on a
 * vertical pitch diagram, attacking goal at the top (y near 0) and own goal
 * at the bottom (y near 100) — matches how Transfermarkt draws it.
 * Only the primary position (before any parenthetical) is used.
 */
const POSITION_COORDS: { test: RegExp; x: number; y: number }[] = [
  { test: /goalkeeper|\bgk\b/i, x: 50, y: 92 },
  { test: /right.?back|right.?wing.?back/i, x: 80, y: 74 },
  { test: /left.?back|left.?wing.?back/i, x: 20, y: 74 },
  { test: /center.?back|centre.?back|\bcb\b/i, x: 50, y: 78 },
  { test: /defensive midfielder|\bcdm\b/i, x: 50, y: 58 },
  { test: /attacking midfielder|\bcam\b/i, x: 50, y: 30 },
  { test: /central midfielder|\bcm\b/i, x: 50, y: 45 },
  { test: /right midfielder|right winger/i, x: 84, y: 32 },
  { test: /left midfielder|left winger/i, x: 16, y: 32 },
  { test: /striker|forward|\bst\b|\bcf\b/i, x: 50, y: 12 },
];

/** Splits "Center Back (Left Back)" into a primary position and an optional secondary one. */
export function parsePosition(position: string | null | undefined): { primary: string; secondary: string | null } | null {
  if (!position) return null;
  const match = position.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (match) return { primary: match[1]!.trim(), secondary: match[2]!.trim() };
  return { primary: position.trim(), secondary: null };
}

export function getPositionCoords(position: string | null | undefined): { x: number; y: number } | null {
  const primary = parsePosition(position)?.primary ?? "";
  for (const entry of POSITION_COORDS) {
    if (entry.test.test(primary)) return { x: entry.x, y: entry.y };
  }
  return null;
}
