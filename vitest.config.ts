import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";

// Kept separate from vite.config.ts so tests don't pull in the TanStack Start
// and Nitro build plugins.
export default defineConfig(({ mode }) => ({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["src/**/*.test.ts"],
    // .env values (e.g. the Supabase keys) for the opt-in database test only.
    env: loadEnv(mode, process.cwd(), ""),
  },
}));
