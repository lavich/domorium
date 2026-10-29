## 1. Inlay hints

- [x] 1.1 In `packages/language-server/src/createServer.ts`, convert an LSP range to an `OffsetRange` through `documents.get(uri).offsetAt`, and have the inlay hint handler pass `params.range` to `getInlayHints`, answering empty when the document or service is missing. Verify with tests in `packages/language-server/src/stdio.test.ts`, written first, one per scenario of "Inlay hints are answered for the requested range" in `language-server/range-requests` (including the CRLF variant, a range of `(0,0)-(999,0)`, and a request before `didOpen` answered `[]`), over the document the spec gives; then `npm run typecheck -w packages/language-server`

## 2. Semantic tokens

- [x] 2.1 In `createServer.ts`, record in `initialize` whether the client declared `textDocument.semanticTokens.requests.range` (optional chaining; `true` or an object counts), offer `{ legend, range: true }` to such a client and `{ legend, range: false, full: true }` to any other. Verify with tests in `stdio.test.ts`, one per scenario of "Semantic tokens are offered by range to a client that can ask by range", asserting `semanticTokensProvider` with `toEqual({ legend: semanticTokenLegend, range: true })` for the range-capable client and `toEqual({ legend: semanticTokenLegend, range: false, full: true })` for the others (`toMatchObject` cannot show `full` is absent), one of them initializing with no capabilities; the existing initialize test (`stdio.test.ts:200-231`), which asserts nothing about semantic tokens, still passes
- [x] 2.2 Register `connection.languages.semanticTokens.onRange` and have it and the full handler share one function that builds tokens for an optional range and encodes them with `SemanticTokensBuilder`. Verify with tests in `stdio.test.ts` for every scenario of "Semantic tokens are answered for the range asked", decoding the returned `data` into lines; the full request is sent by a client that was offered `range` only, and a range request before `didOpen` is answered `{ data: [] }`

## 3. VS Code

- [ ] 3.1 Build the extension (`npm run build:vscode`), run it in VS Code on `apps/web-editor/public/simpsons70.ged` and on a GEDCOM file between 25 and 45 MB, generated for the check by a throwaway script that repeats `INDI` and `FAM` records into `/tmp` and is not committed (no such file is in the repository, and the issue's 51 MiB file is above the 50 MB VS Code will hand to an extension), with `"gedcomLanguageServer.trace.server": "verbose"` in the user settings (the client's id, `apps/vscode/src/browserClientMain.ts:103-104`). Verify that only `textDocument/semanticTokens/range` is sent, never `full`; that its ranges and the inlay hint ranges follow the viewport on scroll; that colour and indentation hints are unchanged on the small file, and that the large file's lines are coloured once the request after a scroll returns. Edits to the large file still pause for the full reparse, which this change does not touch; the check is that range requests are sent and colour arrives after a scroll. Record what was seen under "Implementation" in `design.md`
- [ ] 3.2 Check by hand in a JetBrains IDE (`./apps/jetbrains/gradlew -p apps/jetbrains runIde`) that semantic colour and indentation hints are as before. Verify on `apps/web-editor/public/simpsons70.ged`; record it, or that it was not run, under "Implementation" in `design.md`

## 4. Documentation

- [x] 4.1 Add an `## Unreleased` section to `apps/vscode/CHANGELOG.md` with an entry naming #150: on a large file, colour and indentation hints are built for the visible lines rather than the whole file. No entry in the JetBrains `<change-notes>`, which keep no unreleased section and whose behaviour does not change. Check that `packages/language-server/README.md` says nothing this change makes untrue. Verify with `npm run check:docs`

## 5. Gate

- [x] 5.1 Run `npm run check`; record whether `check:jetbrains` ran or was skipped for lack of a JDK
