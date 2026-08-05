# Domorium — GEDCOM Web Editor

The [Domorium homepage](https://domorium.com/) combines direct links to the
VS Code, Obsidian, and JetBrains integrations with a working browser editor for
`.ged` and `.gedcom` files. Files are read, parsed, validated, edited, and
downloaded entirely in the browser; their contents are never uploaded.

The interface is built with React, Tailwind CSS, and official shadcn components.
It includes a preloaded example, local file opening, diagnostics navigation,
light and dark themes, and a responsive editor workspace.

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
