import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export const CONTACT_URL = "https://github.com/Sv3nFuchs/transfer-wire/issues";
export const LEGAL_UPDATED = "9 October 2026";

/** Shared layout for the Terms and Privacy pages. */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated {LEGAL_UPDATED}</p>
        <div className="mt-8 space-y-8 text-sm leading-relaxed [&_h2]:mb-2 [&_h2]:text-2xl [&_li]:ml-5 [&_li]:list-disc [&_p+p]:mt-3 [&_ul]:mt-2 [&_ul]:space-y-1">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
