import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchEverysportHtml } from "./everysport-fetch.server";

function stubFetch(response: Partial<Response> & { text?: () => Promise<string> }) {
  const fn = vi.fn(async () => response as Response);
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("fetchEverysportHtml", () => {
  it.each([
    ["another site", "https://evil.example.com/team/1"],
    ["plain http", "http://www.everysport.com/team/1"],
    ["a lookalike host", "https://www.everysport.com.evil.io/team/1"],
    ["credentials in front of another host", "https://everysport.com@evil.io/team/1"],
  ])("refuses %s without making a request", async (_name, url) => {
    const fn = stubFetch({ ok: true, text: async () => "" });
    await expect(fetchEverysportHtml(url)).rejects.toThrow(/everysport\.com/);
    expect(fn).not.toHaveBeenCalled();
  });

  it("rejects text that is not a URL", async () => {
    await expect(fetchEverysportHtml("not a url")).rejects.toThrow(/valid URL/);
  });

  it("fetches an everysport.com page, adding https:// when it is missing", async () => {
    const fn = stubFetch({ ok: true, url: "https://www.everysport.com/team/1", text: async () => "<html>ok</html>" });
    await expect(fetchEverysportHtml("www.everysport.com/team/1")).resolves.toBe("<html>ok</html>");
    expect(fn).toHaveBeenCalledWith("https://www.everysport.com/team/1", expect.anything());
  });

  it("refuses a page that redirects to another host", async () => {
    stubFetch({ ok: true, url: "https://evil.example.com/landing", text: async () => "<html>bad</html>" });
    await expect(fetchEverysportHtml("https://www.everysport.com/team/1")).rejects.toThrow(/everysport\.com/);
  });

  it("reports a failed request", async () => {
    stubFetch({ ok: false, status: 503, statusText: "Service Unavailable", url: "https://www.everysport.com/team/1" });
    await expect(fetchEverysportHtml("https://www.everysport.com/team/1")).rejects.toThrow(/503/);
  });
});
