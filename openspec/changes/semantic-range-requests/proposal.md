## Why

The language server builds inlay hints and semantic tokens for the whole document on every request, though `@domorium/language-service` already answers for a range (`getSemanticTokens(range?)` and `getInlayHints(range?)`, `packages/language-service/src/languageService.ts:129,187`). The inlay hint handler drops the `params.range` the request carries (`packages/language-server/src/createServer.ts:103-109`), and semantic tokens are declared `range: false, full: true` (`createServer.ts:94-98`), so no client can ask for less. On a 51 MiB file against a 50-line viewport that is 2,470,220 hints in 801 ms (183.4 MB of JSON) instead of 50 in 0.1 ms, and 6,220,351 tokens in 863 ms instead of 126. Reported as lavich/domorium#150.

## The requirement, as the user decided it

2026-10-29, asked "#150: как отдавать семантические токены? (inlay hints в любом случае начнут учитывать присланный диапазон)": **"По клиенту"** — a client that declares range requests (VS Code) is offered semantic tokens by range only: tokens are computed for the visible lines, and the colour off screen comes from the TextMate grammar. LSP4IJ, which can only ask for the whole document, gets the whole document as today.

## What Changes

- The server answers `textDocument/inlayHint` for the range the request carries, converted to offsets through the open document, instead of for the whole document. Every client.
- At `initialize`, the server reads `textDocument.semanticTokens.requests.range` from the client's capabilities. A client that declares it is offered `semanticTokensProvider` with `range: true` and no `full`; any other client is offered `full: true, range: false`, as today.
- The server answers `textDocument/semanticTokens/range` for the requested range, and keeps answering `textDocument/semanticTokens/full` for the whole document.
- Answers stay bounded by whole level-0 records, as `rootsInRange` narrows (`packages/language-service/src/libs/range/rootsInRange.ts`): a viewport inside one very large record still gets that record's hints and tokens. Not changed here.
- No breaking change. `language-server` is internal and unpublished; the protocol it speaks gains a request and narrows answers it was already allowed to narrow.

## Capabilities

### New Capabilities

- `language-server/range-requests`: how much of a document the server builds inlay hints and semantic tokens for, and which semantic token requests it offers to which client.

### Modified Capabilities

None. `vscode/textmate-grammar` already requires the grammar and the semantic layer to paint alike, which is what lets VS Code show grammar colour off screen without a visible seam; this change relies on that requirement and does not change it.

## Impact

- Layers: `language-server` (adapter) only. It calls into `language-service` through methods that already take an `OffsetRange`; `language-service` and `validator` are unchanged. Dependencies still point down.
- Editor hosts:
  - VS Code changes. It declares range requests (`vscode-languageclient` 11), so it gets semantic tokens for the visible lines plus a viewport above and below, re-requested on scroll and edit, and inlay hints for the same span.
  - JetBrains is unchanged. LSP4IJ 0.20.1 declares semantic token requests `full` only, sends only `semanticTokens/full`, and asks for inlay hints over the whole document; it gets exactly what it gets today. A known limit, not a regression.
  - The web editor and the Obsidian plugin are unaffected: they call `@domorium/language-service` through `@domorium/codemirror`, which already passes each visible range (`packages/codemirror/src/extensions.ts:521,552`).
- Docs: an `## Unreleased` entry in `apps/vscode/CHANGELOG.md`, which receives the change through the server. `packages/language-server` keeps no changelog. The JetBrains `<change-notes>` keep no unreleased section, and JetBrains behaviour does not change, so it gets no entry.
