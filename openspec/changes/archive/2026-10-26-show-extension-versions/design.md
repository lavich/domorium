## Context

The site's pages are React components rendered to HTML at build time (`apps/web-editor/src/site/`, ADR-0014). They ship no framework runtime; ADR-0015 allows small inline scripts that enhance markup which works without them. The route table attaches them per page (`routes.tsx`, `SitePage.scripts`), and `document.tsx:60-62` renders them into `<head>`, before the body exists — the widget catches clicks on `document` for that reason (`widget.ts:9-10`), and `widgetScript.test.ts` runs the script before the body to prove it. The domain is served by GitHub Pages behind Cloudflare; neither sets a Content-Security-Policy today.

Sources, checked on 2026-10-26 with `Origin: https://domorium.com`:

| Product   | `GET`                                                                           | `value` today   |
| --------- | ------------------------------------------------------------------------------- | --------------- |
| VS Code   | `img.shields.io/github/v/tag/lavich/domorium.json?filter=vscode-v*&sort=semver` | `vscode-v1.7.2` |
| Obsidian  | `img.shields.io/github/v/release/lavich/domorium-obsidian.json`                 | `v1.12.0`       |
| JetBrains | `img.shields.io/jetbrains/plugin/v/33323.json`                                  | `v1.7.1`        |
| npm       | `img.shields.io/npm/v/@domorium/codemirror.json`                                | `v2.1.0`        |

All four answer with `access-control-allow-origin: *` and are cached by shields.io for five minutes. They are simple `GET`s, so a browser sends no preflight.

The Visual Studio Marketplace's own query API answers a browser too, but its terms allow it only inside Visual Studio products, and shields.io retired its Marketplace badges for that reason (badges/shields#11792). The JetBrains Marketplace API sends no CORS header. GitHub's API would serve Obsidian directly, but its unauthenticated limit is 60 requests an hour per address, shared with everything else behind that address.

## Goals / Non-Goals

**Goals:**

- A page shows the version a product has now, with no build or deploy after a release.
- A page that gets no answer reads exactly as it does today.

**Non-Goals:**

- Versions in the HTML. Googlebot runs scripts and may index a page with them filled in; nothing else will see them without a script.
- Changelogs, release dates or download counts.
- Versions in the navigation, on sibling cards, or inside the editor at `/editor/`.

## Decisions

### Slots inside elements already drawn

Components render `<span data-version="vscode" hidden></span>` (and `obsidian`, `jetbrains`, `codemirror`) inside an element whose place in the layout is already fixed, so a filled slot widens it and, except in one case, moves nothing below: the `released` badge of each landing card, the product chip at the top of an integration page, and the "On npm" link. A filled slot reads `v1.7.2`, separated by a space; inside the npm link it becomes part of the link's name, which then says which version the link leads to. The exception is the "On npm" pill between 640 and 768 pixels wide, where the wider pill takes a line from the paragraph beside it; that reflow is accepted.

### Sources in the script, and when it runs

The script holds the four sources, each a URL and the prefix its `value` carries (`vscode-v` or `v`). It runs from `<head>`, so it waits for `DOMContentLoaded` (or acts at once if `document.readyState` is past `loading`), then collects the slots, asks only the sources that have one, and fills every slot of a product. It is ES5 text like the theme and widget scripts: `var`, `function`, promises without `async`.

### Only a version is written

From `value` the prefix is removed, and the rest is accepted only when it matches `^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$`. It is written with `textContent`. An error, a non-2xx status, a `value` of another shape, or no answer within 5 seconds (`AbortController`) leaves the slot hidden. Requests go with `referrerPolicy: "no-referrer"`.

### Kept for the tab, failures not kept

A version is stored in `sessionStorage` per product and read before asking, so pages opened in the same tab do not ask again; a new tab asks once more. A failure is not stored, so the next page tries again. Access is wrapped in `try`, as storage can throw in a private window.

### The VS Code version is the latest tag

The tag is pushed when a release is approved to start; the workflow publishes after a protected-environment approval (`release-vscode.yml`). If that approval is refused or the publish fails, the site shows a version the Marketplace does not have until a later tag replaces it. The user accepted this in exchange for staying within the Marketplace's terms.

### ADR-0017

The decision outlives this change: it binds every later page script that asks a third party. The ADR states the rule (public data only, no credentials or cookies, a timeout, the page reading the same without an answer, the third parties named in the ADR and in `apps/web-editor/README.md`), and that it narrows the open site change's statement that the pages carry two scripts (`openspec/changes/2026-09-10-site-pages-around-the-editor/design.md:327-328`). It also notes that a Content-Security-Policy added later, in Cloudflare or the HTML, must allow `connect-src https://img.shields.io`.

## Risks / Trade-offs

- [shields.io changes a route or goes away.] → Slots stay hidden; the page reads as before. A test pins the answer shape.
- [The VS Code tag runs ahead of the Marketplace after a failed publish.] → Accepted by the user; the release runbook already treats a failed publish as something to fix at once.
- [Readers' addresses reach shields.io.] → Named in the ADR and the README; no credentials, no referrer.

## Migration Plan

Deploys with the site from `main`. Reverting is removing the script, the slots and the ADR's rule.

## Implementation

- `VersionSlot` and the script live in `src/site/versions.tsx`; each integration names its `product`. The slot is preceded by a space in the HTML, so a filled version reads as a word of its own (`released v1.7.2`, `On npm v2.1.0`) to a screen reader and in copied text; empty, the space collapses.
- After code review: a late answer from a `fetch` that ignores its abort signal is dropped; a kept value that is not a version is asked for again; ADR-0015 is left as accepted, with the link only in ADR-0017's header; the open site change's two sentences that this contradicts now say so.
- `/editor/` renders the same header, so GitHub's mark appears there too, as the other marks already did, without the footer's trademark note; that was already true of the other marks.
- Checked in a browser on the built site, 2026-10-26: `/` showed `released v1.7.2`, `v1.12.0`, `v1.7.1` on the cards and `v2.1.0` on the npm link, `/vscode/` showed `VS Code v1.7.2` in its chip; with `img.shields.io` blocked every slot stayed hidden and the badge read `released`. The header and footer carried GitHub's mark.
