import { createFileRoute } from "@tanstack/react-router";

// The site is private while it waits for permission to use Everysport data,
// so there is nothing to list. Kept as an empty sitemap rather than a 404 so
// crawlers that still ask get a clean answer.
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () =>
        new Response(
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n`,
          { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } },
        ),
    },
  },
});
