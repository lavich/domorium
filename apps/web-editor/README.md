# Domorium — GEDCOM Web Editor

This app builds both [domorium.com](https://domorium.com/) and the editor at
[/editor/](https://domorium.com/editor/) — a browser editor for `.ged` and
`.gedcom` files. Files are read, parsed, validated, edited, and downloaded
entirely in the browser; their contents are never uploaded.

The interface is built with React, Tailwind CSS, and official shadcn components.
It includes a preloaded example, local file opening, diagnostics navigation,
light and dark themes, and a responsive editor workspace.

The problems panel gathers repeats of one finding under a single line that counts
them and names the first place, because a real vendor export can state one true
thing thousands of times. Errors open by themselves unless there are many of them;
anything else waits to be asked for.

The panel stands beside the document it describes, and the status bar reads that
document: its GEDCOM version, the place in it, what was found in it. A tab holding
a note or a photograph shows no version and no findings — it states what is true of
that file instead, and the panel is not there to be read as an all-clear.

## Working in a folder on your computer

Where the browser supports the File System Access API — Chrome, Edge and other
Chromium browsers — **Open a folder** grants the editor read and write access to
one folder you choose. The explorer then lists everything in it, not only GEDCOM
files: a note or a photograph a record points at opens beside the document, and a
`FILE` or `NOTE` path in the GEDCOM is followed to the file it names. Nothing is
uploaded; the folder is read in the page.

Firefox and Safari implement no folder picker, so there the editor stays a single
chosen file and says so in the explorer.

A few things are worth knowing:

- **Saving is explicit.** Nothing is written until you ask: ⌘/Ctrl-S writes the
  document back to its own file, ⇧⌘/Ctrl-Shift-S opens the browser's save dialog so
  you choose the folder and the name. Without a granted folder, saving downloads a
  copy and leaves the original alone.
- **The folder is not remembered between visits.** The browser only grants access
  to the page that asked for it, for as long as it is open, so opening the folder
  again after a reload is deliberate rather than a limitation.
- **A file the editor could not decode is not written back.** A 5.5.1 file
  declaring `1 CHAR ANSEL` is read as UTF-8 by the browser, so writing it back
  would put the mangled decode on disk; the editor refuses and says why.
- **Unsaved work is not lost silently.** Closing a tab, granting another folder or
  leaving the page asks first.

It is also the reference host for [`@domorium/codemirror`](../../packages/codemirror)
— whatever a CodeMirror host needs from the shared packages should be visible in
this app's small amount of code.

## The pages around the editor

`/` is a landing page and `/vscode/`, `/obsidian/` and `/jetbrains/` are a page
per integration. They are React components rendered to HTML at build time and
ship no JavaScript to the browser; the editor itself stays a single-page app at
`/editor/`, served from the one hand-written `editor/index.html`.

One place declares a page: `src/site/routes.tsx` — its path, title, description,
structured data and body. The same table is the source of `sitemap.xml`, so a
page cannot be published without appearing in it, and `src/site/paths.ts` holds
the paths every internal link is built from. Marketplace addresses stay in
`src/constants/links.ts` and are read by the integration pages.

Adding a page means adding a row to that table. `npm run build` then writes it,
and the dev server renders it from the same table, so `/` is not a 404 in
development.

`public/og.png` is the social card every page points at, rendered from
`scripts/og-card.svg` — which embeds its heading face, so it renders the same
with nothing installed. Open it in a browser and capture it at 1200×630 to make
the PNG again; no build step reads either file.

## Development

```bash
npm install                        # from the repository root
npm run dev -w apps/web-editor
```

The shared packages are consumed through workspace links. After changing one of
them, rebuild it so the dev server picks the change up:

```bash
npm run build:libs                 # from the repository root
```

## Scripts

| Command             | Description                         |
| ------------------- | ----------------------------------- |
| `npm run dev`       | Vite dev server                     |
| `npm run build`     | Type-check, bundle, then prerender  |
| `npm run preview`   | Serve the production bundle locally |
| `npm run typecheck` | Type-check without emitting         |

## Deployment

`npm run build` runs three steps: Vite builds the editor's shell, a second Vite
build compiles `src/site/entry-server.tsx` into `.ssr/`, and
`scripts/prerender-site.mjs` writes the pages, `sitemap.xml`, `robots.txt` and
`404.html` into `dist`. It locates the compiled stylesheet through the build
manifest, so every page links the one the editor links.

Merging to `main` deploys the site to GitHub Pages at `domorium.com` when
web-related paths change; there is no release tag. The repository's Pages custom
domain and the Cloudflare DNS records are configured outside the source tree.
See the release topology in
[docs/architecture.md](../../docs/architecture.md).

## Trademark notice

Domorium is an independent project and is not affiliated with or endorsed by
FamilySearch or Intellectual Reserve, Inc. FAMILYSEARCH GEDCOM™ and FAMILYSEARCH®
are trademarks of Intellectual Reserve, Inc.
