import { describe, expect, it } from "vitest";

import {
  buildRobots,
  buildSitemap,
  renderDocument,
  renderNotFound,
} from "./document";
import { PATHS, pageAt, pages, SITE_ORIGIN } from "./routes";

const stylesheet = "/assets/index-abc123.css";
const landing = () => {
  const page = pageAt(PATHS.home);
  if (!page) {
    throw new Error("the landing page is not declared");
  }
  return page;
};

describe("renderDocument", () => {
  it("writes a document a browser reads without a script", () => {
    const html = renderDocument(landing(), { stylesheet });
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain('<html lang="en"');
    expect(html).toContain(`<link rel="stylesheet" href="${stylesheet}"`);
    expect(html).not.toContain('type="module"');
  });

  it("states the page's own title, description and canonical URL", () => {
    const page = landing();
    const html = renderDocument(page, { stylesheet });
    expect(html).toContain(`<title>${page.title}</title>`);
    expect(html).toContain(
      `<meta name="description" content="${page.description}"/>`,
    );
    expect(html).toContain(
      `<link rel="canonical" href="${SITE_ORIGIN}${page.path}"/>`,
    );
  });

  it("carries a social card whose addresses are absolute", () => {
    const page = landing();
    const html = renderDocument(page, { stylesheet });
    expect(html).toContain(`content="${page.title}"`);
    expect(html).toContain('property="og:type"');
    expect(html).toContain(`content="${SITE_ORIGIN}${page.path}"`);
    expect(html).toContain(`content="${SITE_ORIGIN}/og.png"`);
    expect(html).toContain('content="summary_large_image"');
  });

  it("carries the structured data the page declared", () => {
    const page = landing();
    const html = renderDocument(page, { stylesheet });
    const scripts = [
      ...html.matchAll(
        /<script type="application\/ld\+json">(.*?)<\/script>/gs,
      ),
    ].map(([, json]) => JSON.parse(json));
    expect(scripts).toEqual(page.structuredData);
  });

  it("resolves the theme before the first paint", () => {
    const html = renderDocument(landing(), { stylesheet });
    expect(html).toContain("domorium-theme");
    expect(html.indexOf("domorium-theme")).toBeLessThan(html.indexOf("<body"));
  });
});

describe("renderNotFound", () => {
  it("keeps the not-found page out of the index and claims no canonical URL", () => {
    const html = renderNotFound({ stylesheet });
    expect(html).toContain('<meta name="robots" content="noindex"/>');
    expect(html).not.toContain('rel="canonical"');
    expect(html).toContain(`href="${PATHS.home}"`);
  });
});

describe("buildSitemap", () => {
  it("lists every published page, and only those", () => {
    const xml = buildSitemap(pages, { lastmod: "2026-09-10" });
    for (const page of pages) {
      expect(xml).toContain(`<loc>${SITE_ORIGIN}${page.path}</loc>`);
    }
    expect([...xml.matchAll(/<url>/g)]).toHaveLength(pages.length);
    expect(xml).toContain("<lastmod>2026-09-10</lastmod>");
  });
});

describe("buildRobots", () => {
  it("lets a crawler in and names the sitemap", () => {
    const robots = buildRobots();
    expect(robots).toContain("User-agent: *");
    expect(robots).toContain("Allow: /");
    expect(robots).toContain(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`);
  });
});
