const ALLOWED_HOSTS = new Set(["www.everysport.com", "everysport.com"]);

const NOT_ALLOWED = "Only everysport.com league or team page URLs can be used.";

function assertAllowed(url: URL) {
  if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname)) throw new Error(NOT_ALLOWED);
}

/**
 * Every server-side fetch of an Everysport page goes through here, so a URL
 * stored on a team (or typed into the importer) can never make the server
 * request some other site — including after a redirect.
 */
export async function fetchEverysportHtml(rawUrl: string): Promise<string> {
  const raw = rawUrl.trim();
  let parsed: URL;
  try {
    parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    throw new Error("That doesn't look like a valid URL.");
  }
  assertAllowed(parsed);

  const res = await fetch(parsed.toString(), {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; TransferWire/1.0)" },
  });
  if (res.url) assertAllowed(new URL(res.url));
  if (!res.ok) throw new Error(`Everysport request failed: ${res.status} ${res.statusText}`);
  return res.text();
}
