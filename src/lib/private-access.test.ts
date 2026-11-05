import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The site is private: read functions must run as the signed-in user so the
// database's row-level security can refuse everyone else.
describe("read server functions require a logged-in user", () => {
  for (const file of ["grassroots.functions.ts", "matches.functions.ts"]) {
    const source = readFileSync(new URL(`./${file}`, import.meta.url), "utf8");

    it(`${file}: no function uses the anonymous client`, () => {
      expect(source).not.toMatch(/createPublicClient/);
    });

    it(`${file}: every server function has the auth middleware`, () => {
      const functions = source.split(/export const \w+ = createServerFn/).slice(1);
      expect(functions.length).toBeGreaterThan(0);
      for (const body of functions) {
        expect(body.slice(0, 200)).toContain(".middleware([requireSupabaseAuth])");
      }
    });
  }
});
