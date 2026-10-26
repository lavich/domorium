# 0017. Let a page script ask a third party for public data, on fixed terms

- **Status:** Accepted
- **Date:** 2026-10-26
- Adds terms to: [0015](0015-run-the-editor-inside-the-landing-page.md) for a
  page script that asks a third party

## Context

The site's pages are rendered to HTML at build time and deployed from `main`
(ADR-0014). ADR-0015 allowed them small inline scripts that enhance markup which
works without them; the theme and the editor widget are the two there are, and
neither leaves the domain.

The pages name each product but not its version, and the version changes with
every release. Building it into the HTML means rebuilding the site after each
release, and the Obsidian plugin is released from another repository. The user
wants the pages to stay current with no step after a release, so the reader's
browser has to ask for the version when a page opens.

None of the stores is a good party to ask. The Visual Studio Marketplace's terms
allow its query API only inside Visual Studio products; the JetBrains Marketplace
sends no CORS header; GitHub's API allows 60 unauthenticated requests an hour per
address, shared with everything else behind that address. shields.io relays all
four versions — the VS Code extension as the repository's latest `vscode-v*` tag
— with CORS and a five-minute cache.

## Decision

A page script may ask a third party for data, on these terms, and only on them:

- The data is public and names nothing about the reader. The request carries no
  credentials or cookies and no referrer.
- The request gives up after a fixed timeout, and the page without an answer
  reads exactly as its HTML does: an answer only fills in what the HTML leaves
  out.
- An answer is checked against the shape it must have and written as text, never
  as markup.
- Every third party a page contacts is named in `apps/web-editor/README.md`.

When this was accepted the one in use was shields.io (`img.shields.io`), asked by
the landing page and the integration pages for the current version of each
product.

## Consequences

A release shows on the site without rebuilding it. The cost is that each reader's
address reaches shields.io once per tab, and that the pages depend on a service
outside the project for a detail; when it is gone the detail is gone and nothing
else is.

The VS Code version is the latest release tag, which is pushed before the publish
is approved. A refused or failed publish leaves the site naming a version the
Marketplace does not have until a later tag.

A Content-Security-Policy added later, in Cloudflare in front of GitHub Pages or
in the HTML, must allow `connect-src https://img.shields.io`, or the versions
disappear without an error anyone sees.

## Alternatives considered

**Build the versions into the HTML and rebuild after each release.** Rejected by
the user as not automatic enough: the Obsidian plugin's release would need a
scheduled rebuild, and every release here a deploy.

**Ask the Visual Studio Marketplace directly.** Rejected: its terms forbid it,
which is also why shields.io retired its own Marketplace badges.

**A proxy of our own.** Rejected: the domain has no server, and adding one is a
larger decision than a version string.
