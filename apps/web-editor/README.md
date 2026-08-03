# Domorium — GEDCOM Web Editor

Browser editor for `.ged` and `.gedcom` files, deployed at
[lavich.github.io/domorium](https://lavich.github.io/domorium/). No upload and no
server: the file is parsed and validated entirely in the browser.

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

Merging to `main` deploys to GitHub Pages when web-related paths change; there is
no release tag. See the release topology in
[docs/architecture.md](../../docs/architecture.md).

## Trademark notice

Domorium is an independent project and is not affiliated with or endorsed by
FamilySearch or Intellectual Reserve, Inc. FAMILYSEARCH GEDCOM™ and FAMILYSEARCH®
are trademarks of Intellectual Reserve, Inc.
