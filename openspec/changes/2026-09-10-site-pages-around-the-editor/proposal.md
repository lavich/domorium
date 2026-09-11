## Why

`domorium.com` is one URL, and that URL is an application shell. `index.html`
carries a `<title>` and an empty `<div id="root">` — no description, no canonical,
no social card, no structured data. Google therefore renders the editor and writes
the snippet from what it sees on screen: the header's `<h1>`, the row of product
buttons, the `example.ged` tab, and the line numbers CodeMirror draws in the
gutter. The result in the search listing reads

> Open, **validate and edit GEDCOM locally**. VS Code Obsidian JetBrains GitHub.
> example.ged. 999. 1. 2. 3. 4. 5. 6. 7. …

which is the interface being read aloud, not a description of the product.

The second half of the problem is structural. Sitelinks — the rows Google draws
under a result — are built only from indexed URLs of the same site. This site has
no second URL: every link to an integration leaves for a marketplace
(`src/constants/links.ts`). There is nothing for Google to put in them, and no
markup that asks for them; only pages earn them.

There is no server. The domain is GitHub Pages, and the deployed artifact is
`apps/web-editor/dist` (`.github/workflows/quality.yml`), so whatever answers a
crawler has to be a file in that directory.

## What Changes

- `apps/web-editor` builds a small static site around the editor. The editor moves
  to `/editor/`; `/` becomes a landing page, and each integration gets a page of
  its own: `/vscode/`, `/obsidian/`, `/jetbrains/`.
- The pages are React components rendered to HTML at build time with
  `renderToStaticMarkup`, from one route table that is also the source of the
  sitemap. No client-side JavaScript is shipped to them and no route is hydrated.
- Every page states its own `title`, `description`, canonical URL, Open Graph and
  Twitter card, and carries JSON-LD: `SoftwareApplication` per product, `WebSite`
  on the landing page, `BreadcrumbList` on the pages under it.
- The build also emits `robots.txt`, `sitemap.xml` and `404.html`.
- The editor's header stops linking straight to the marketplaces and links to the
  integration pages instead, which is where the install button now lives. The
  marketplace URLs stay in `src/constants/links.ts` and are read by those pages.
- Per ADR-0007, the landing page leads with Domorium and the integration pages lead
  with GEDCOM, crediting Domorium as the publisher.
- A decision record for the URL change, because marketplace listings, plugin
  manifests and the search index will all hold `https://domorium.com/editor/`
  afterwards.

## Capabilities

### New Capabilities

- `web-editor/site-pages`: the domain answers a crawler with prose it wrote about
  itself, on a page per product, rather than with an application shell a renderer
  has to guess at.

### Modified Capabilities

None. No existing spec describes the page's head, its URLs, or the header's
outbound links.

## Impact

- **Layers:** `apps/web-editor` only. No package below it is touched, nothing new
  is imported by a shared package, and the dependency direction is unchanged.
  `public/` stays at the site root, so the editor's `BASE_URL`-relative fetch of
  the example is unaffected by its move to `/editor/`.
- **Editor hosts:** none. VS Code, JetBrains and Obsidian ship no code from this
  change; their READMEs and listings link to the web editor and those links move to
  `/editor/`. The Obsidian plugin lives in its own repository (ADR-0005) and links
  to `https://domorium.com/`, which keeps working and now lands on the page that
  explains the product.
- **Releases:** none. `apps/web-editor` is private and unversioned; the existing
  `deploy-web` job publishes it on merge to `main`, and the build gains steps
  rather than a new workflow.
- **Documentation:** an ADR and its index row, `apps/web-editor/README.md`,
  `docs/architecture.md` where it describes what the app emits, and the web-editor
  links in the root and per-app READMEs.
- **Outside the repository:** Search Console has to be verified for the domain
  before the sitemap can be submitted and the five URLs recrawled on request.
  Without it the change still works and Google simply takes longer to notice.
