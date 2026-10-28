## 1. The library

- [x] 1.1 Add `resolveFileTarget` and `relativeFilePath` in `packages/language-service/src/libs/links/fileTargetPath.ts`, deciding relativity with `fileLinkKind` and decoding per segment as `decodeFileTarget` does, and export both, and the type `GedcomDialect`, from `src/index.ts`. Verify with tests written first in `fileTargetPath.test.ts`, one per scenario of `language-service/file-target-path`, plus the plugin's cases from `domorium-obsidian/src/editor/service.test.ts`
- [x] 1.2 Add `drawnCrop` in `packages/language-service/src/libs/media/drawnCrop.ts` and export it. Verify with tests written first in `drawnCrop.test.ts`, one per scenario of `language-service/media-crop`, plus the plugin's cases from `domorium-obsidian/src/editor/media.test.ts`
- [x] 1.3 Rebuild with `npm run build -w packages/language-service`. Verify that `dist/index.d.ts` declares the three functions

## 2. CodeMirror

- [x] 2.1 Re-export `resolveFileTarget`, and the type `GedcomDialect`, from `packages/codemirror/src/index.ts` beside `DocumentSymbolKind`, and rebuild with `npm run build -w packages/codemirror`. Verify with a test in `packages/codemirror/src/index.test.ts` that the package exposes it, beside the existing export tests

## 3. The web editor

- [x] 3.1 Pass the dialect with the link: `onFollowLink(link, dialect)` in `createGedcomEditor.ts`, read from the service updated for the click, through `GedcomEditor.tsx`, the `workspace.followLink` command, `App.tsx`, `cordis/testing.tsx` and the mock in `App.test.tsx`. Verify with `npm run typecheck` and a test in `createGedcomEditor.test.ts` that Ctrl-clicks a payload and expects the document's own dialect
- [x] 3.2 Have `followLink` resolve a `file-relative` link with `resolveFileTarget` and map `null` to the two notices through `resolveInWorkspace`'s `OutsideWorkspaceError`. Verify with tests in `apps/web-editor/src/workspace/followLink.test.ts`, one per scenario of `web-editor/follow-file-link`, with every existing test given a dialect (5.5.1 for "reads a Windows separator")

## 4. Documentation

- [x] 4.1 `packages/language-service/README.md`: a short section on resolving a payload, spelling a path and clamping a crop, with an example whose names exist. Verify with `npm run check:docs` and by running the example against `dist`
- [x] 4.2 `## Unreleased` entries naming #380: `packages/language-service/CHANGELOG.md` (the three functions) and `packages/codemirror/CHANGELOG.md` (the re-export). Verify with `npm run check:docs`

## 5. Gate

- [x] 5.1 Run `npm run check`; record whether `check:jetbrains` ran or was skipped for lack of a JDK. Ran: 1463 tests, and `check:jetbrains` ran with a JDK
