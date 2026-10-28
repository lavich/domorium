## Context

- The library already holds the dialect rules for a payload: `decodeFileTarget` (7.0 percent-decodes each segment, 5.5.1 leaves the text) and `normalize` (5.5.1 treats `\` as a separator, 7.0 does not) in `packages/language-service/src/libs/links/retargetFileLinks.ts:27-56,140-148`. `documentLinks` decides which payloads are `file-relative` (`documentLinks.ts:86-107`).
- A host knows the dialect through `service.getDocument().getDialect()` (`languageService.ts:185`).
- The plugin's two path functions and `drawnCrop` are pure and tested in `domorium-obsidian` (`src/editor/service.test.ts`, `src/editor/media.test.ts`); the web editor's `resolveInWorkspace` also normalizes paths the gateways receive (`memoryGateway.ts`, `folderGateway.ts`) and stays for that.
- `MediaCrop` says clamping "belongs to whoever holds the file" (`types.ts:99-103`): who calls it, not who owns the arithmetic.

## Goals / Non-Goals

**Goals:** one reading of a relative `FILE` payload, by the dialect's rules, that every host can call; its inverse; the crop clamp. See proposal.md for the user's decision.

**Non-Goals:** the language server's link resolution (VS Code, JetBrains); absolute payloads and `file:` URIs; the Obsidian plugin's adoption; a host's decision whether to draw a remote image, or how big a preview is.

## Decisions

### Pure functions, dialect passed in

Each takes what it needs and nothing else, so a host calls it with values it already holds and a test needs no document. Paths are root-relative with `/` separators and no leading `/` — the form a vault or a granted folder uses.

### `resolveFileTarget` reads the payload the way `moveFileLinks` writes it

It decodes with `decodeFileTarget`, splits at `/` and, for any dialect other than 7.0, also at `\` (the rule `normalize` already applies), drops empty and `.` segments, and pops on `..`. It answers `null` when a `..` would climb above the root, and for a target that starts with `/` or a drive (`C:`), which is not relative. It reuses the existing helpers rather than restating them, so reading and writing cannot drift.

### `relativeFilePath` returns a plain path

The plugin's `relativeToDocument`, unchanged in behaviour: `..` per folder the document sits below the shared prefix, then the rest. Plain, not encoded, because `moveFileLinks(from, to)` takes plain paths and encodes per dialect itself. Whether the dialect can write the result is `moveFileLinks`'s question, not this function's.

### `drawnCrop` moves as it is

The plugin's function and its tests, unchanged: a non-positive image size or a rectangle the image does not reach gives `null`, meaning "draw the whole image".

### The web editor keeps its own refusal messages

`followLink` takes the dialect, calls `resolveFileTarget` for a `file-relative` link and turns `null` into the refusal `resolveInWorkspace` gave as `OutsideWorkspaceError`. `resolveInWorkspace` stays for the gateways.

Behaviour decision, not architecture: the contract lives in the specs (ADR-0018).

## Risks / Trade-offs

- [A 5.5.1 file that relied on nothing special] → unchanged: 5.5.1 is neither decoded nor split differently.
- [A 7.0 file with a literal `\` in a name] → the web editor now looks for that name instead of a subfolder; that is what the format says, and matches what `documentLinks` and `moveFileLinks` already assume.
- [Two copies until the plugin adopts the functions] → the plugin's PR deletes its copies; tracked in that repository.
