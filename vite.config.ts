import { defineConfig, loadEnv } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig(async ({ command, mode }) => {
  const plugins = [];

  if (mode === "development") {
    const { devtools } = await import("@tanstack/devtools-vite");
    plugins.push(devtools({ logging: false }));
  }

  plugins.push(
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      server: { entry: "server" },
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
    }),
    viteReact(),
  );

  if (command === "build") {
    const { nitro } = await import("nitro/vite");
    plugins.push(
      nitro({
        defaultPreset: "cloudflare-module",
        compatibilityDate: "2026-09-07",
        // Pinned: Nitro otherwise derives the name from the git remote, so renaming the repo would deploy a new Worker.
        cloudflare: { deployConfig: true, nodeCompat: true, wrangler: { name: "sv3nfuchs-grassroot-player-hub" } },
        experimental: { tasks: true },
        // Project root has no server/ dir, so nitro won't scan for tasks/
        // (or routes/, plugins/, etc.) without this pointed at "./".
        serverDir: "./",
        // Keeps fixtures/results fresh from Everysport without a manual admin sync.
        scheduledTasks: { "0 */3 * * *": "fixtures:sync" },
      }),
    );
  }

  // Expose VITE_-prefixed env vars as build-time constants.
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const envDefine: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  return {
    define: envDefine,
    css: { transformer: "lightningcss" as const },
    resolve: {
      alias: { "@": `${process.cwd()}/src` },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
    optimizeDeps: {
      include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime"],
      ignoreOutdatedRequests: true,
    },
    server: { host: true, port: 8080 },
    plugins,
  };
});
