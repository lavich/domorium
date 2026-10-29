## Context

- `initialize` reads one client capability today, `insertReplaceSupport`, with optional chaining into a closure variable (`packages/language-server/src/createServer.ts:62,68-70`), and returns a static `InitializeResult` with `inlayHintProvider: true` (`:81`) and `semanticTokensProvider: { legend, range: false, full: true }` (`:94-98`).
- The inlay hint handler ignores `params.range` and returns `service.getInlayHints()` (`:103-109`). The only semantic token handler is the full one, `connection.languages.semanticTokens.on`, which calls `service.getSemanticTokens()` and encodes with `SemanticTokensBuilder` (`:390-411`).
- The service is rebuilt from `change.document.getText()` on every content change (`:428-433`), so its offsets are offsets into the text `documents.get(uri)` holds; `TextDocument.offsetAt` converts a position into one, clamping past the end. Handlers that need the document fetch it beside the service (`:153,170`).
- `getSemanticTokens(range?)` and `getInlayHints(range?)` take an `OffsetRange` (`packages/language-service/src/languageService.ts:129,187`) and narrow through `rootsInRange`, which binary-searches level-0 records and keeps those with `endOffset > from` and `startOffset < to` (`packages/language-service/src/libs/range/rootsInRange.ts:12-42`). `@domorium/codemirror` already passes each visible range (`packages/codemirror/src/extensions.ts:521,552`).
- VS Code (`vscode-languageclient` 11.0.0) declares requests `range: true` and `full: { delta: true }` (`node_modules/vscode-languageclient/lib/common/semanticTokens.js:91-92`), registers a full provider only when the server offers `full` (`:117-120`) and a range provider when it offers `range: true` (`:173-208`). With only a range provider, VS Code's viewport contribution asks for `getVisibleRangesPlusViewportAboveBelow()` and asks again on scroll, edit, theme and provider change, debounced between 100 and 500 ms, and stops asking once a full answer exists (`src/vs/editor/contrib/semanticTokens/browser/viewportSemanticTokens.ts`; confirmed in the shipped JS of VS Code 1.143.1). Its inlay hint controller takes the same visible ranges plus a viewport above and below, widens each by 30 lines each way and merges the ranges that touch (`src/vs/editor/contrib/inlayHints/browser/inlayHintsController.ts`, `_getHintsRanges`). The extension host drops any hint outside the requested range (`_isValidInlayHint`), so for inlay hints, unlike semantic tokens, an answer broader than the range buys nothing.
- The VS Code extension runs the server in a web worker (`apps/vscode/src/browserServerMain.ts:13`) and has coloured GEDCOM with a TextMate grammar since 1.7.0 (`apps/vscode/syntaxes/gedcom.tmLanguage.json`), held to paint as the semantic layer does by `vscode/textmate-grammar`.
- LSP4IJ 0.20.1 (`apps/jetbrains/build.gradle.kts:30`), read in its bytecode: `ClientCapabilitiesFactory` declares semantic token requests `full = TRUE, range = FALSE`; only `LSPSemanticTokensSupport` names a semantic token request, and it is `semanticTokensFull` — no class references `semanticTokensRange`; `LSPInlayHintsProvider.getViewPortRange` builds `Range(Position(0, 0), toPosition(document.getTextLength()))`, the whole document.

## Goals / Non-Goals

**Goals:** VS Code builds hints and tokens for what it shows; every other client gets what it gets today. See proposal.md for the user's decision.

**Non-Goals:** semantic tokens `full.delta`, `inlayHint/resolve`, narrowing below a whole level-0 record, and anything in JetBrains — LSP4IJ asks for the whole document in both requests, and changing that is LSP4IJ's to do.

## Decisions

### Which semantic token requests are offered is read from the client

`initialize` records whether `params.capabilities?.textDocument?.semanticTokens?.requests?.range` is truthy, in a closure variable beside `insertReplaceSupport`. The type is `boolean | {}`, so an empty object counts. A client that declares it is offered `{ legend, range: true }`; any other client, `{ legend, range: false, full: true }`.

Range only, not range and full, because that is the user's decision and because offering both would not save the work: VS Code then asks for the visible range while the full request is in flight and still builds the whole document. The full handler stays registered, so a client that sends `semanticTokens/full` unoffered is still answered.

Alternative rejected: range for every client, as the issue first proposed. LSP4IJ never sends a range request, so a JetBrains IDE offered only `range` would lose semantic colour altogether.

This trusts what the client declares: a client that declared `requests.range` but sent only `semanticTokens/full` would lose semantic colour. VS Code and JetBrains are the only supported LSP hosts, and both do what they declare.

### A range becomes offsets through the open document

Both handlers take `documents.get(uri)` beside `cache.get(uri)`, return the empty answer when either is missing, as rename does, and call the service with `{ from: document.offsetAt(range.start), to: document.offsetAt(range.end) }`. One small function in `createServer.ts` does the conversion for both; no new module. No handler calls `offsetAt` today, so the first one on a document builds its line index (60–300 ms on 25 MB); that happens once per open, because incremental edits update the index in place (`vscode-languageserver-textdocument`, `FullTextDocument.update`).

The inlay hint handler always passes the range, whatever was offered: `range` is required on `InlayHintParams`, and LSP4IJ's whole-document range yields the whole document as before.

### Hints and tokens outside the range are sent, not trimmed

The answer covers whole records, as `rootsInRange` returns them; that the service builds nothing for other records is `rootsInRange`'s guarantee, and the spec states only what the server answers. LSP lets a `semanticTokens/range` answer cover more than was asked, provided it is correct for what it covers; for inlay hints it says nothing, and VS Code discards the extra hints, so the spec allows them rather than requiring them. Trimming the encoded tokens to the requested lines would shrink the answer for a viewport inside one huge record, but the walk is what costs, and it would already have run; left for when such a record is measured.

### Encoding stays where it is

The range handler encodes with `SemanticTokensBuilder` exactly as the full handler does; the two share one function that takes the optional range. Positions in the service's tokens are absolute, so a range answer needs no shift.

Behaviour decision, not architecture: the contract lives in `language-server/range-requests` (ADR-0018).

## Risks / Trade-offs

- [Scrolling in VS Code to a part of the document not yet asked about] → semantic colour arrives after the debounce and the request. Below 20 MB and 300,000 lines the grammar has already coloured it alike, so nothing visible changes. Above that, VS Code turns tokenization off (`TextModel.LARGE_FILE_SIZE_THRESHOLD`, `LARGE_FILE_LINE_COUNT_THRESHOLD`), so the newly shown lines are briefly plain; today the same file waits about a second for the whole document on every edit. Checked by hand in task 3.1.
- [A file over 50 MB in VS Code] → VS Code does not sync it to extensions (`TextModel._MODEL_SYNC_LIMIT`), so the server never sees the 51 MiB file the issue measured. The saving applies to every smaller file in proportion to its size.
- [JetBrains] → unchanged, and still builds the whole document on every inlay hint and semantic token request. A known limit of LSP4IJ 0.20.1, stated in the proposal; revisit when LSP4IJ declares range requests.
- [A viewport inside one very large record] → the whole record is answered. Bounded by record size, as the issue accepts.

## Implementation

- The conversion (`offsetRange`) and the encoding (`semanticTokens`) are module-level functions in `createServer.ts` beside `HOVER_MAX_LINES`, since neither reads the server's state.
- The range-request tests in `stdio.test.ts` bundle the server once in a `beforeAll` and start a process per scenario, where the older tests bundle per test.
- The VS Code changelog entry does not say the grammar colours what is off screen: above 20 MB, where the change matters, VS Code does not run the grammar at all.
- `npm run check` passed with 1491 tests, and `check:jetbrains` ran with a JDK. One earlier run of `check:typescript` alone exited non-zero and was not reproduced in two further runs; its log was not kept.
- Tasks 3.1 and 3.2 are left to a person: they need VS Code and a JetBrains IDE.
