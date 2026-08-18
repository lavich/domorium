# Domorium — GEDCOM Web Editor

The [Domorium homepage](https://domorium.com/) combines direct links to the
VS Code, Obsidian, and JetBrains integrations with a working browser editor for
`.ged` and `.gedcom` files. Files are read, parsed, validated, edited, and
downloaded entirely in the browser; their contents are never uploaded.

The interface is built with React, Tailwind CSS, and official shadcn components.
It includes a preloaded example, local file opening, diagnostics navigation,
light and dark themes, and a responsive editor workspace.

The problems panel gathers repeats of one finding under a single line that counts
them and names the first place, because a real vendor export can state one true
thing thousands of times. Errors open by themselves unless there are many of them;
anything else waits to be asked for.

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
| `npm run build`     | Type-check, then production bundle  |
| `npm run preview`   | Serve the production bundle locally |
| `npm run typecheck` | Type-check without emitting         |

## Deployment

Merging to `main` deploys the site to GitHub Pages at `domorium.com` when
web-related paths change; there is no release tag. The repository's Pages custom
domain and the Cloudflare DNS records are configured outside the source tree.
See the release topology in
[docs/architecture.md](../../docs/architecture.md).

## Trademark notice

Domorium is an independent project and is not affiliated with or endorsed by
FamilySearch or Intellectual Reserve, Inc. FAMILYSEARCH GEDCOM™ and FAMILYSEARCH®
are trademarks of Intellectual Reserve, Inc.
