## 1. The range in the service

- [ ] 1.1 Add `CompletionTextEdit` (`newText`, `insert`, `replace`) and a required `textEdit` on `CompletionItem` in `packages/language-service/src/types.ts`. Verify with `npm run typecheck`
- [ ] 1.2 In `src/libs/completion/completion.ts`, compute the token from the full line and set `textEdit` on every item; have `GedcomLanguageService.getCompletionItems` pass the line text. Verify with tests written first in `completion.test.ts`, one per scenario of `language-service/completion-range`, replacing the assertion that no `insertText` is set
- [ ] 1.3 Rebuild with `npm run build -w packages/language-service`. Verify that `dist` declares `textEdit`

## 2. The server

- [ ] 2.1 In `packages/language-server/src/createServer.ts`, record `insertReplaceSupport` from `initialize` and map each item's `textEdit` to an `InsertReplaceEdit` or a `TextEdit` over `replace`. Verify with tests in `stdio.test.ts` for both scenarios of `language-server/completion-edit`

## 3. CodeMirror

- [ ] 3.1 In `packages/codemirror/src/extensions.ts`, take `from` from `insert.start` and give each option an `apply` that replaces up to the replace end, kept as its distance past the cursor. Verify with tests in `packages/codemirror` driving an `EditorView`, one per scenario of `codemirror/completion-apply`
- [ ] 3.2 Rebuild with `npm run build -w packages/codemirror`

## 4. Documentation

- [ ] 4.1 `packages/language-service/README.md` and `packages/codemirror/README.md`: say what `textEdit` means and how the editor uses it, and check every name in their usage examples still exists. Verify with `npm run check:docs`
- [ ] 4.2 `## Unreleased` entries in `packages/language-service/CHANGELOG.md` and `packages/codemirror/CHANGELOG.md` naming #468. Verify by reading them against the specs

## 5. Gate

- [ ] 5.1 Run `npm run check`; record whether `check:jetbrains` ran or was skipped for lack of a JDK
