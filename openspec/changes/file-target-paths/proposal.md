## Why

Turning a `FILE` payload into the file it names is written three times, and the copies disagree with the library that reads the payload. The Obsidian plugin (`domorium-obsidian/src/editor/service.ts:3-22`) and the web editor (`apps/web-editor/src/workspace/fileGateway.ts:63-85`, reached from `followLink.ts:40`) both split at `\` and never decode, while this package says a GEDCOM 7 payload is a URI reference in which `\` is a character and `%20` is an escape (`packages/language-service/src/libs/links/retargetFileLinks.ts:23-56,140-148`). So `1 FILE photos/my%20photo.jpg` in a GEDCOM 7 file opens nothing in either host. The inverse — how a document spells a path — exists only in the plugin (`service.ts:25-43`), and clamping a `CROP` to the loaded image only there (`domorium-obsidian/src/editor/media.ts:123-139`). Reported as lavich/domorium#380.

## The requirement, as the user decided it

2026-10-28, asked how much should move into `@domorium/language-service`: **"Paths both ways + crop (Recommended)"** — `resolveFileTarget` and its inverse, dialect-aware (escapes and backslashes per 5.5.1 and 7.0), and `drawnCrop`; the web editor switches to them in this repository; the Obsidian plugin follows in its own PR once the package is published.

## What Changes

- `@domorium/language-service` exports three pure functions:
  - `resolveFileTarget(documentPath, targetText, dialect)`: the root-relative path a relative `FILE` payload names, read by the dialect's rules, or `null` when it climbs above the root or is not relative.
  - `relativeFilePath(documentPath, path)`: the plain relative path from the document's folder to a root-relative path, the form `moveFileLinks` takes.
  - `drawnCrop(crop, naturalWidth, naturalHeight)`: the `CROP` rectangle clamped to the loaded image, or `null` where the image does not reach it.
- `apps/web-editor` follows a file link through `resolveFileTarget`, so a GEDCOM 7 `%20` opens its file and a 5.5.1 `\` still separates.
- No breaking change: a minor release of `@domorium/language-service`, made later by a separate release PR.

## Capabilities

### New Capabilities

- `language-service/file-target-path`: resolving a relative `FILE` payload against the document, and spelling a path from it.
- `language-service/media-crop`: clamping a `CROP` to the image a host loaded.
- `web-editor/follow-file-link`: which file the web editor opens for a relative `FILE` payload.

### Modified Capabilities

None.

## Impact

- Layers: `language-service` (new functions over its own types and the validator's `GedcomDialect`), `apps/web-editor` (one call site). Dependencies still point down; nothing new is imported.
- Editor hosts: the web editor changes here. VS Code and JetBrains do not: the language server resolves a link through `new URL` against the document URI (`packages/language-server/src/createServer.ts:487-502`), which already decodes correctly for 7.0 and refuses `\`; making it use `resolveFileTarget` is a separate change. The Obsidian plugin adopts the functions in its own repository after release.
- Docs: `packages/language-service` README and CHANGELOG. `apps/web-editor` keeps no changelog; the PR says what changed.
