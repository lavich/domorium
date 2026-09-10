# 0014. Serve a site around the editor, with the editor at `/editor/`

- **Status:** Accepted
- **Date:** 2026-09-10

## Context

`domorium.com` published one URL, and that URL was the editor's application
shell: a `<title>`, an empty root element, and everything else assembled by
JavaScript. A search listing for the domain therefore quoted the interface —
the header's strapline, the row of product buttons, the name of the example
file, and the line numbers CodeMirror draws in its gutter — because the page
offered no description of its own for a listing to use.

The domain also had no second URL. Every link to an integration left for a
marketplace, so nothing on the site linked to anything else on the site. The
rows a search engine draws under a result are built from a site's own indexed
pages; there were none to build them from, and no markup can ask for them.

The host is GitHub Pages. There is no server, no redirect and no rewrite: a
path answers only if a file sits at it, and the deployed artifact is
`apps/web-editor/dist`.

## Decision

Publish a static site from `apps/web-editor`, with the editor at `/editor/` and
a page at `/`.

- `/` is a landing page; `/vscode/`, `/obsidian/` and `/jetbrains/` are a page
  per integration. All four are React components rendered to HTML at build
  time, ship no client-side JavaScript, and are declared in one route table
  that is also the source of `sitemap.xml`.
- `/editor/` is the application shell, unchanged but for its own head.
- The editor's header links to the integration pages rather than to the
  marketplaces; each page carries the install for its platform.
- Per ADR-0007 the landing page leads with Domorium and the platform pages lead
  with GEDCOM.

## Consequences

The domain now describes itself: every page states a title, a description, a
canonical URL, a social card and structured data, so a listing quotes prose
written for it. Four indexed pages linked to each other are what a search
engine needs to offer sitelinks — it may still decline, and nothing here can
compel it.

The editor is one click further away, and every existing link to
`https://domorium.com/` — the marketplace listings, the plugin manifests, the
READMEs, whatever readers have bookmarked — now lands on the landing page
rather than in the editor. Those links keep working, and the landing page's
first action opens the editor.

`https://domorium.com/editor/` is the editor's address from now on and appears
in the search index and in three marketplace listings, which is what makes this
expensive to reverse. The build grows two steps beyond `vite build`, and a new
page has to be added to the route table rather than dropped in as a file.

## Alternatives considered

**Keep the editor at `/` and append prose to it.** Rejected: the shell fills
the viewport and has no room for prose, and the interface would remain the
loudest text a renderer sees. It would fix the description tag and leave the
snippet's source unchanged.

**Describe the page with metadata only, and publish no other page.** Rejected
as half the problem: it makes the snippet correct and leaves the site with one
URL, so sitelinks stay impossible.

**Author the pages as hand-written HTML files.** Rejected: the header, footer
and product cards would be copied into four files and would drift from each
other and from the editor they front.

**Add a static-site framework beside Vite.** Rejected as the right tool at the
wrong size — a second framework and a second build to keep green, for four
pages.
