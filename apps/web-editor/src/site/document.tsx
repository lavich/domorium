import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { themeScript } from "@/theme";

import { absolute, notFound, SITE_ORIGIN, type SitePage } from "./routes";

interface DocumentFields {
  title: string;
  description: string;
  canonical: string | null;
  structuredData: object[];
  body: ReactElement;
  stylesheet: string;
  scripts: string[];
}

function documentHtml({
  title,
  description,
  canonical,
  structuredData,
  body,
  stylesheet,
  scripts,
}: DocumentFields): string {
  const card = canonical ?? absolute("/");
  return `<!doctype html>${renderToStaticMarkup(
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <meta name="description" content={description} />
        {canonical ? <link rel="canonical" href={canonical} /> : null}
        {canonical ? null : <meta name="robots" content="noindex" />}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Domorium" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={card} />
        <meta property="og:image" content={`${SITE_ORIGIN}/og.png`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={`${SITE_ORIGIN}/og.png`} />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: light)"
          content="#ffffff"
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: dark)"
          content="#0a0a0a"
        />
        <link rel="stylesheet" href={stylesheet} />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {scripts.map((script, index) => (
          <script key={index} dangerouslySetInnerHTML={{ __html: script }} />
        ))}
        {structuredData.map((entry, index) => (
          <script
            key={index}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(entry) }}
          />
        ))}
      </head>
      <body>{body}</body>
    </html>,
  )}`;
}

export function renderDocument(
  page: SitePage,
  { stylesheet }: { stylesheet: string },
): string {
  if (!page.body) {
    throw new Error(`${page.path} is served by the application shell`);
  }
  return documentHtml({
    title: page.title,
    description: page.description,
    canonical: absolute(page.path),
    structuredData: page.structuredData,
    body: page.body,
    stylesheet,
    scripts: page.scripts ?? [],
  });
}

export function renderNotFound({ stylesheet }: { stylesheet: string }): string {
  return documentHtml({
    title: notFound.title,
    description: notFound.description,
    canonical: null,
    structuredData: [],
    body: notFound.body,
    stylesheet,
    scripts: [],
  });
}

export function buildSitemap(
  pages: SitePage[],
  { lastmod }: { lastmod: string },
): string {
  const urls = pages
    .map(
      (page) =>
        `  <url>\n    <loc>${absolute(page.path)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function buildRobots(): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`;
}
