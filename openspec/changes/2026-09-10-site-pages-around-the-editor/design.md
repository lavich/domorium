## Context

See proposal.md — Why. The constraints that shape the approach:

- The host is GitHub Pages: static files, no redirects, no rewrites, no headers.
  A path answers only if a file sits at it, and `deploy-pages` uploads
  `apps/web-editor/dist` and nothing else.
- Googlebot executes JavaScript, so `<noscript>` content is not read and cannot be
  used to feed a crawler. The only reliable answer is HTML that already holds the
  words.
- Tailwind v4 arrives through `@tailwindcss/vite` and scans the project's sources,
  so classes used by page components are compiled without configuration.
- ADR-0007 fixes the naming: a platform page leads with GEDCOM and credits
  Domorium; only ecosystem-level material leads with the brand.
- `src/constants/links.ts` is the single place holding marketplace URLs, and stays
  so.
- The FamilySearch independence notice required of specification-derived material
  has to appear where a reader of the site can find it.

## Goals / Non-Goals

**Goals:**

- The snippet Google shows is a sentence the project wrote, on every URL.
- Four indexable pages exist under the domain, linked to each other by descriptive
  anchors, so sitelinks have something to be made of.
- One place declares a page: its path, its head, its structured data and its body.
  A page that exists cannot be missing from the sitemap.
- The landing page ships no framework runtime. It is HTML and one stylesheet.

**Non-Goals:**

- Client-side routing, hydration, or an SPA fallback. Five URLs, five files.
- A blog, documentation site, or informational pages about the GEDCOM format.
  Worth doing later, and nothing here forecloses it.
- Localisation. The repository's material is English and this follows it.
- Guaranteeing sitelinks. They are Google's to grant; this change earns them.

## Decisions

### The editor moves to `/editor/` and `/` becomes a page

A landing page at `/` gives a crawler prose to quote, an `<h1>` that is a claim
rather than a strapline, and the internal links that sitelinks are drawn from. The
alternative — keeping the editor at `/` and appending a text block to it — was
rejected: the shell is `h-svh` and holds no room for prose, and the interface would
still be the loudest text on the page a renderer sees.

The cost is a click before the editor, and that every existing link to
`https://domorium.com/` now lands one step away from it. Accepted: those links come
from marketplace listings, where a reader is choosing a product rather than opening
a file, and the landing page's first action is **Open the editor**. This is the
decision the ADR records, because the search index and three marketplace listings
will hold the new URL.

### Pages are React rendered to static markup at build time

The pages are components under `src/site/`, rendered by
`renderToStaticMarkup` — not `renderToString`, since nothing hydrates and the
markers would be dead weight. They reuse the app's theme tokens, its `Button`
variants and `LINKS`, so the site cannot drift from the editor it fronts, and yet
no React reaches the browser on those routes.

The build becomes three steps:

```text
vite build                                  → dist/editor/index.html, assets, manifest
vite build --ssr src/site/entry-server.tsx  → .ssr/ (outside dist; not deployed)
node scripts/prerender-site.mjs             → dist/index.html, dist/vscode/index.html,
                                              …, sitemap.xml, robots.txt, 404.html
```

`build.manifest` is turned on so the prerender step can find the hashed stylesheet
the client build emitted. `editor/index.html` stays the one hand-written HTML file
with a `<script>` in it, and is the only Vite HTML input.

_Alternative considered:_ hand-written static HTML per page. Cheaper by one build
step, but the header, footer and product cards would be copied into four files and
would rot separately. _Alternative considered:_ Astro alongside Vite. The right
tool for a content site and the wrong size for four pages — a second framework and
a second build to keep green.

### The route table is the only place a page is declared

`src/site/routes.tsx` exports one entry per page: path, title, description, the
JSON-LD it carries, and the component for its body. The prerender script iterates
that table for the HTML _and_ for `sitemap.xml`, so a page cannot be added without
appearing in the sitemap, and neither can go stale against the other.

`src/site/document.tsx` holds the two pure functions the script uses —
`renderDocument(page, { stylesheet })` and `buildSitemap(pages)` — so what is worth
testing is tested by Vitest in `src/`, and `scripts/prerender-site.mjs` stays
input and output.

### One stylesheet for the whole domain

The static pages link the same compiled CSS as the editor, located through the
manifest. One compilation of the tokens for the whole domain, already in the
browser's cache by the time a reader opens `/editor/`, and no second Tailwind entry
to drift. The unused editor rules it carries are a smaller cost than two stylesheets
that disagree about what `--primary` means.

Theme follows from the same `domorium-theme` key `ThemeProvider` writes, read by a
small inline script in `<head>` that sets the `dark` class before first paint. That
script is also the pages' only JavaScript, and it arms one button in the header
that walks the three choices the editor's menu offers — system, light, dark — so
the theme can be changed from wherever the reader is rather than only in the
editor. The key lives in `src/theme.ts` now, imported by both, because two copies
of it would drift into two themes.

The button is a single cycling control rather than a menu: a menu on a static page
means focus management and keyboard handling in hand-written script, which is more
to get wrong than the choice is worth. CSS hides the button until the script has
set `data-theme-choice` on the root, so a reader without JavaScript is never shown
a control that could do nothing, and one icon per choice is revealed by the same
attribute.

### Heads, drafted

Titles stay under 60 characters and descriptions between 150 and 160, which is what
a desktop result shows before it truncates. The strings are content and may be
edited later without touching the spec; these are the ones this change ships:

| Path          | Title                                    |
| ------------- | ---------------------------------------- |
| `/`           | Domorium — GEDCOM editor and validator   |
| `/editor/`    | GEDCOM editor in the browser — Domorium  |
| `/vscode/`    | GEDCOM for Visual Studio Code — Domorium |
| `/obsidian/`  | GEDCOM for Obsidian — Domorium           |
| `/jetbrains/` | GEDCOM for JetBrains IDEs — Domorium     |

Each description says what the page is for and that files stay in the browser;
none repeats another. Canonical URLs are absolute and keep the trailing slash, the
form GitHub Pages itself redirects to.

### The dev server renders the same pages

`vite dev` serves HTML files, and after this change the only one is
`editor/index.html` — so without help `/` would be a 404 in development and the
pages would first be seen in a production build. A small plugin in the app's Vite
config answers a page path in dev by loading `src/site/entry-server.tsx` through
`ssrLoadModule` and rendering it, so the route table is the source of the pages in
both modes and the difference is only where the stylesheet comes from.

### The pages' visual language

Three directions were drawn and compared, and the dark product page won — then a
Stitch mockup arrived that the reader preferred, and that is what is built. The
earlier direction is not in the code; the canvas keeps it as history.

The system is the mockup's: warm paper `#f7f6f2` under charcoal `#1a1c1a`, a
forest green `#263428` on every pill-shaped action, white cards inside soft
`#e5e3dc` borders, Inter for everything and JetBrains Mono for anything that is
GEDCOM. `--font-heading` therefore resolves to the sans, and no display face
ships at all.

Two decisions keep it from spreading where it should not:

The palette is **scoped to the pages**, declared on the shell's `.site` class and
on `html:has(.site)` for the ground behind it, so the editor keeps the Studio
Utility tokens it was built on. One stylesheet, two palettes, no drift — and the
frame where the landing page runs the editor is the one place they meet, which
the mockup also draws as its own window.

The drawn windows of **other** editors are dark whatever the reader chose, fixed
by `.editor-mock`: they stand for someone else's application, not for this page.
The dark theme's ground is a shade deeper than their surface so a drawn window
still reads as a window rather than as a hole.

### No integration is the default, and a phone is not a narrow desktop

The three integrations are equals, so the hero's second action leads to the
section that lists all four places rather than to whichever one happened to be
first in the table — the test in `routes.test.tsx` holds that, since the
temptation to point it at one is permanent.

The pages are laid out for a phone rather than merely surviving on one: the
navigation is one scrolling row of thumb-height targets rather than a second row
of small ones, actions run the full width, the vertical rhythm halves, and the
editor panel drops its explorer column so the record itself gets the width. The
`sm` breakpoint restores the desktop composition.

### The editor itself, on the reader's ask

The landing page runs the real editor where the drawing was, in an `<iframe>` of
`/editor/?embed=1`, once the reader clicks. The drawing stays as the first paint
and as what a crawler reads, the controls are links to `/editor/` that a script
in the head upgrades, and a second control takes the frame full screen. The
reasoning and what it costs are in ADR-0015, which supersedes ADR-0014's claim
that the pages ship no client-side JavaScript.

Two details are load-bearing. The frame is same-origin, so the editor inside it
reads the same theme, fetches the same example and is given the browser's file
pickers — a cross-origin frame would lose all three. And `?embed=1` makes the
editor drop the wordmark, the product links and the theme control: the page
around the frame already carries them, and two of each read as a broken page.

The script is caught on the document rather than on the controls, because the
head runs before the body is parsed — the first version queried the controls and
found nothing, and the test that missed it had handed the script a parsed body.

### The social card is a hand-made asset, not a build step

`og:image` must be a raster format, and the site has only `favicon.svg`. One
1200×630 `public/og.png` serves every page, rendered once from
`scripts/og-card.svg` and committed. The source stays beside the prerender script
rather than in `public/`, because nothing on a page references it and `dist`
should carry only what a page asks for. The SVG embeds its heading face, so it
renders the same in any browser with nothing installed, and the PNG can be made
again by opening it and capturing it at 1200×630.

## Risks

- **Google may still write its own description.** It does that when the page's
  prose answers a query better than the meta tag. That is a good outcome now and an
  impossible one today: whatever it quotes will be prose from the page rather than
  the gutter.
- **Sitelinks may not appear.** Nothing in the specification of the web can demand
  them. Four indexed pages, clean titles, a sitemap and internal links are the whole
  of what a site can do.
- **Recrawling is not immediate.** Without a verified Search Console property the
  new URLs are found on Google's own schedule. Verification is a task here, the
  submission of the sitemap is a manual step after the deploy.
- **A dead internal link is now possible.** Four HTML files that no test opens could
  point at each other wrongly. The route table makes the paths constants, and the
  tests assert that every internal link a page renders is a path the table declares.
