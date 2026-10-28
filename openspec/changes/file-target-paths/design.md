## Context

- The library already holds the dialect rules for a payload: `decodeFileTarget` (7.0 percent-decodes each segment, 5.5.1 leaves the text) and `normalize` (5.5.1 treats `\` as a separator, 7.0 does not) in `packages/language-service/src/libs/links/retargetFileLinks.ts:27-56,140-148`. `documentLinks` decides which payloads are `file-relative` (`documentLinks.ts:86-107`).
- A host knows the dialect through `service.getDocument().getDialect()` (`languageService.ts:185`).
- The plugin's two path functions and `drawnCrop` are pure and tested; its `resolveVaultRelativePath` neither decodes nor refuses an absolute path, which is harmless there only because `routeDocumentLink` filters on `file-relative` first (`service.ts:59`). They are tested in `domorium-obsidian` (`src/editor/service.test.ts`, `src/editor/media.test.ts`); the web editor's `resolveInWorkspace` also normalizes paths the gateways receive (`memoryGateway.ts`, `folderGateway.ts`) and stays for that.
- `MediaCrop` says clamping "belongs to whoever holds the file" (`types.ts:99-103`): who calls it, not who owns the arithmetic.

## Goals / Non-Goals

**Goals:** one reading of a relative `FILE` payload, by the dialect's rules, that every host can call; its inverse; the crop clamp. See proposal.md for the user's decision.

**Non-Goals:** the language server's link resolution (VS Code, JetBrains); absolute payloads and `file:` URIs; the Obsidian plugin's adoption; a host's decision whether to draw a remote image, or how big a preview is.

## Decisions

### Pure functions, dialect passed in

Each takes what it needs and nothing else, so a host calls it with values it already holds and a test needs no document. Paths are root-relative with `/` separators and no leading `/` — the form a vault or a granted folder uses.

### `resolveFileTarget` reads the payload the way `moveFileLinks` writes it

Whether a payload is relative at all is `fileLinkKind`'s answer (`documentLinks.ts:15-26`), not a second rule: in GEDCOM 7 that already excludes `\`, `:`, `?`, `#`, a leading `/` and a literal `..`; in 5.5.1 it excludes `/`, `\\` and a drive. It then splits — at `/`, and outside 7.0 also at `\` (the rule `normalize` applies) — and only then decodes each segment in 7.0, the per-segment decoding of `decodeFileTarget`, so `%2F` cannot become a separator. A decoded segment that is `.` or `..` or holds `/` or `\` gives `null`: a name no host can follow without reading it as a path, and the web editor's gateways split at `\` (`fileGateway.ts:71`). A result that is the root folder itself is `null` too, since no host opens a folder from a `FILE` link.

### `relativeFilePath` returns a plain path

The plugin's `relativeToDocument` (`domorium-obsidian/src/editor/service.ts:25-43`), unchanged: `..` per folder the document sits below the shared prefix, then the rest. Plain, not encoded, because `moveFileLinks(from, to)` takes plain paths and encodes per dialect itself. Whether the dialect can write the result is `moveFileLinks`'s question, not this function's.

### `drawnCrop` moves as it is

The plugin's function and its tests, unchanged: a non-positive image size or a rectangle the image does not reach gives `null`, meaning "draw the whole image".

### The web editor reaches the function through `@domorium/codemirror`

`apps/web-editor` depends only on `@domorium/codemirror` (`package.json:22`, `docs/architecture.md`). It imports nothing from `@domorium/language-service` at runtime today, so `@domorium/codemirror` re-exports `resolveFileTarget`, as it already re-exports `DocumentSymbolKind` (`packages/codemirror/src/index.ts:58-60`). That adds an entry to its changelog and keeps the dependency graph as drawn.

### The dialect travels with the link

`App.tsx` holds no language service; a link reaches it through `onFollowLink` (`createGedcomEditor.ts:53,134-136`), the `workspace.followLink` command (`services/commands.ts:16`, `surfaces/gedcom.tsx:175`) and `cordis/testing.tsx`. The editor reads the dialect from the service it updates for the click, `language.update(view.state.doc).getDocument().getDialect()`, and passes it with the link, so it is never behind the text. `followLink` resolves a `file-relative` link with `resolveFileTarget`; `null` becomes the existing "outside the granted folder" notice when the payload climbs (a 5.5.1 `..` past the root) and "cannot be reached" otherwise. `resolveInWorkspace` stays for the gateways.

Behaviour decision, not architecture: the contract lives in the specs (ADR-0018).

## Risks / Trade-offs

- [A 5.5.1 file that relied on nothing special] → unchanged: 5.5.1 is neither decoded nor split differently.
- [A 7.0 file with a literal `\` in a payload] → not a link for `documentLinks`, so the web editor no longer offers to open it as a subfolder; `%5C` is refused rather than followed.
- [`moveFileLinks` matches payloads through `normalize`, which only strips a leading `./`] → `media/../photo.jpg` in 5.5.1 opens `photo.jpg` but is not retargeted when it moves. Reading and writing still disagree there; that is #188's matcher, outside this change.
- [Two copies until the plugin adopts the functions] → the plugin's PR deletes its copies; tracked in that repository.
