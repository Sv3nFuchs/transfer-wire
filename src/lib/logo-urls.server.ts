/**
 * logo_url holds either an external https URL or a path inside the private
 * club-logos bucket. Bucket paths are turned into signed URLs for display.
 */
export async function resolveLogoUrls(paths: (string | null | undefined)[]) {
  const storagePaths = [
    ...new Set(paths.filter((p): p is string => !!p && !/^https?:\/\//.test(p))),
  ];
  const map = new Map<string, string>();
  if (storagePaths.length === 0) return map;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.storage
      .from("club-logos")
      .createSignedUrls(storagePaths, 60 * 60 * 24 * 7);
    for (const item of data ?? []) {
      if (item.path && item.signedUrl) map.set(item.path, item.signedUrl);
    }
  } catch (error) {
    // No service-role key configured —
    // fall back to no logo for private-bucket paths instead of failing the whole page.
    console.warn("[resolveLogoUrls] Could not sign storage logo URLs:", error);
  }
  return map;
}

export function applyLogo(url: string | null | undefined, map: Map<string, string>) {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  return map.get(url) ?? null;
}
