import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import shell from "../../editor/index.html?raw";
import {
  abilitiesOf,
  DISTINCT_ABILITIES,
  PLACES,
  SHARED_ABILITIES,
} from "./abilities";
import { INTEGRATIONS } from "./integrations";
import { notFound, PATHS, pageAt, pages, SITE_ORIGIN } from "./routes";
import { cardOf, EDITOR_POSTER, shotsOf } from "./shots";

const declared = Object.values(PATHS) as string[];

// An apostrophe in alt text reaches the markup as `&#x27;`.
const readable = (markup: string) =>
  markup
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

// Anchors only: React emits a preload `<link>` of its own for every image.
const internalLinks = (markup: string) =>
  [...markup.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)]
    .map(([, href]) => href)
    .filter((href) => href.startsWith("/"));

describe("the site's pages", () => {
  it("declares one page per published path", () => {
    expect(pages.map((page) => page.path)).toEqual(declared);
  });

  it("titles every page uniquely, within what a search listing shows", () => {
    const titles = pages.map((page) => page.title);
    expect(new Set(titles).size).toBe(titles.length);
    for (const page of pages) {
      expect(page.title.length, page.path).toBeLessThanOrEqual(60);
    }
  });

  it("describes every page uniquely, at the length a listing shows", () => {
    const descriptions = pages.map((page) => page.description);
    expect(new Set(descriptions).size).toBe(descriptions.length);
    for (const page of pages) {
      expect(page.description.length, page.path).toBeGreaterThanOrEqual(150);
      expect(page.description.length, page.path).toBeLessThanOrEqual(160);
    }
  });

  it("carries structured data naming the software on every page", () => {
    for (const page of pages) {
      expect(page.structuredData.length, page.path).toBeGreaterThan(0);
      for (const entry of page.structuredData) {
        expect(JSON.parse(JSON.stringify(entry))).toMatchObject({
          "@context": "https://schema.org",
        });
      }
    }
  });

  it("leads the platform pages with GEDCOM and the platform", () => {
    const platforms = [
      [PATHS.vscode, "Visual Studio Code"],
      [PATHS.obsidian, "Obsidian"],
      [PATHS.jetbrains, "JetBrains"],
    ] as const;
    for (const [path, platform] of platforms) {
      const page = pageAt(path);
      expect(page?.title, path).toMatch(/^GEDCOM for/);
      expect(page?.title, path).toContain(platform);
    }
  });

  it("serves the editor's path from the application shell", () => {
    const editor = pageAt(PATHS.editor);
    expect(editor?.body).toBeNull();
  });

  it("gives the shell the head the table declares for it", () => {
    const editor = pageAt(PATHS.editor);
    expect(shell).toContain(`<title>${editor?.title}</title>`);
    expect(shell).toContain(`content="${editor?.description}"`);
    expect(shell).toContain(`href="${SITE_ORIGIN}${PATHS.editor}"`);
  });

  // The fixed, unscrollable layout is the editor's; a page of prose has to scroll.
  it("marks the shell as the application's own layout", () => {
    expect(shell).toContain('<body class="app-shell">');
  });

  it("renders every page body it declares", () => {
    for (const page of pages.filter((candidate) => candidate.body)) {
      const markup = renderToStaticMarkup(page.body);
      expect(markup, page.path).toContain("<h1");
    }
  });

  it("leads every internal link to a path the site publishes", () => {
    for (const page of [...pages, notFound]) {
      const body = page.body;
      if (!body) {
        continue;
      }
      const links = internalLinks(renderToStaticMarkup(body));
      expect(links.length, page.title).toBeGreaterThan(0);
      for (const href of links) {
        expect(declared, `${page.title} → ${href}`).toContain(href);
      }
    }
  });

  it("links the landing page to the editor and to every integration", () => {
    const landing = pageAt(PATHS.home);
    const links = internalLinks(renderToStaticMarkup(landing?.body));
    for (const path of declared) {
      expect(links, path).toContain(path);
    }
  });

  it("links each integration page to its siblings and to the editor", () => {
    const integrations = [PATHS.vscode, PATHS.obsidian, PATHS.jetbrains];
    for (const path of integrations) {
      const links = internalLinks(renderToStaticMarkup(pageAt(path)?.body));
      expect(links, path).toContain(PATHS.editor);
      for (const sibling of integrations.filter((other) => other !== path)) {
        expect(links, `${path} → ${sibling}`).toContain(sibling);
      }
    }
  });

  // Three integrations, none of them the default: the hero sends a reader to
  // where all of them are, not to whichever one was named first.
  it("singles out no integration in the landing page's actions", () => {
    const markup = renderToStaticMarkup(pageAt(PATHS.home)?.body);
    // From the headline, so the nav — which links to all four equally — is out.
    const hero = markup.slice(
      markup.indexOf("<h1"),
      markup.indexOf('id="extensions"'),
    );
    expect(hero).toContain(`href="${PATHS.editor}"`);
    expect(hero).toContain('href="#extensions"');
    for (const integration of INTEGRATIONS) {
      expect(hero, integration.path).not.toContain(
        `href="${integration.path}"`,
      );
    }
  });

  it("offers the editor itself on the landing page, not only a drawing", () => {
    const landing = pageAt(PATHS.home);
    const markup = renderToStaticMarkup(landing?.body);
    expect(markup).toContain("data-editor-widget");
    expect(markup).toContain("data-editor-frame");
    // The controls are links first, so a reader without scripting still gets
    // the editor rather than a button that does nothing.
    expect(markup).toMatch(
      /<a[^>]*href="\/editor\/"[^>]*data-editor-run|<a[^>]*data-editor-run[^>]*href="\/editor\/"/,
    );
    expect(landing?.scripts?.length, "the script that arms it").toBeGreaterThan(
      0,
    );
  });

  it("carries no page script where there is nothing to arm", () => {
    for (const path of [PATHS.vscode, PATHS.obsidian, PATHS.jetbrains]) {
      expect(pageAt(path)?.scripts ?? [], path).toHaveLength(0);
    }
  });

  it("presents each integration on the landing page, not only in the nav", () => {
    const markup = renderToStaticMarkup(pageAt(PATHS.home)?.body);
    for (const integration of INTEGRATIONS) {
      expect(markup, integration.heading).toContain(integration.heading);
    }
  });

  it("says what every place shares, and a row per difference", () => {
    const markup = renderToStaticMarkup(pageAt(PATHS.home)?.body);
    for (const shared of SHARED_ABILITIES) {
      expect(markup, shared).toContain(shared);
    }
    for (const ability of DISTINCT_ABILITIES) {
      expect(markup, ability.label).toContain(ability.label);
    }
    for (const place of PLACES) {
      expect(markup, place.label).toContain(place.label);
    }
  });

  it("chips each integration with what only that place does", () => {
    for (const integration of INTEGRATIONS) {
      const markup = renderToStaticMarkup(pageAt(integration.path)?.body);
      for (const ability of abilitiesOf(integration.path)) {
        const chip = ability.chip ?? ability.label;
        expect(markup, `${integration.path} → ${chip}`).toContain(chip);
      }
    }
  });

  it("offers the marketplace on the page of each integration", () => {
    for (const integration of INTEGRATIONS) {
      const markup = renderToStaticMarkup(pageAt(integration.path)?.body);
      expect(markup, integration.path).toContain(integration.marketplace.href);
      expect(markup, integration.path).toContain(integration.heading);
    }
  });

  it("says how to install each integration", () => {
    for (const integration of INTEGRATIONS) {
      const markup = renderToStaticMarkup(pageAt(integration.path)?.body);
      const { command, steps } = integration.install;
      for (const instruction of command ? [command] : (steps ?? [])) {
        expect(markup, integration.path).toContain(instruction);
      }
      expect(Boolean(command) || Boolean(steps?.length), integration.path).toBe(
        true,
      );
    }
  });

  it("offers the VS Code install command as a block to copy", () => {
    const markup = renderToStaticMarkup(pageAt(PATHS.vscode)?.body);
    expect(markup).toMatch(
      /<pre[^>]*><code>code --install-extension domorium\.gedcom<\/code>/,
    );
  });

  it("numbers the install steps where installing takes more than a command", () => {
    const markup = renderToStaticMarkup(pageAt(PATHS.obsidian)?.body);
    expect(markup).toContain("<ol");
    expect(markup).toContain("Settings → Community plugins → Browse");
  });

  it("shows each place at work, with every frame in the HTML", () => {
    for (const integration of INTEGRATIONS) {
      const markup = readable(
        renderToStaticMarkup(pageAt(integration.path)?.body),
      );
      for (const shot of shotsOf(integration.path)) {
        expect(markup, `${integration.path} ${shot.name}`).toContain(
          shot.caption,
        );
        expect(markup, `${integration.path} ${shot.name}`).toContain(shot.alt);
        expect(markup, `${integration.path} ${shot.name}`).toContain(
          `/shots/${shot.name}.webp`,
        );
      }
    }
  });

  it("shows the landing page photographs rather than drawings of them", () => {
    const markup = readable(renderToStaticMarkup(pageAt(PATHS.home)?.body));
    for (const integration of INTEGRATIONS) {
      const [first] = shotsOf(integration.path);
      const card = cardOf(integration.path);
      expect(markup, `${integration.path} window`).toContain(
        `/shots/${first?.name}.webp`,
      );
      expect(markup, `${integration.path} card`).toContain(
        `/shots/${card?.name}.webp`,
      );
    }
    expect(markup).toContain(`/shots/${EDITOR_POSTER.name}.webp`);
    expect(markup).toContain(EDITOR_POSTER.alt);
  });

  it("offers a still to a reader who has asked for stillness", () => {
    for (const integration of INTEGRATIONS) {
      const markup = renderToStaticMarkup(pageAt(integration.path)?.body);
      expect(markup, integration.path).toContain("motion-reduce:hidden");
      expect(markup, integration.path).toContain("motion-reduce:block");
    }
  });

  it("offers the theme on every page, not only in the editor", () => {
    for (const page of [...pages, notFound].filter(
      (candidate) => candidate.body,
    )) {
      expect(renderToStaticMarkup(page.body), page.title).toContain(
        "data-theme-toggle",
      );
    }
  });

  it("states the independence from FamilySearch on every page", () => {
    for (const page of pages.filter((candidate) => candidate.body)) {
      expect(renderToStaticMarkup(page.body), page.path).toContain(
        "FamilySearch",
      );
    }
  });

  it("leads the not-found page back into the site", () => {
    const links = internalLinks(renderToStaticMarkup(notFound.body));
    expect(links).toContain(PATHS.home);
    expect(links).toContain(PATHS.editor);
  });
});
