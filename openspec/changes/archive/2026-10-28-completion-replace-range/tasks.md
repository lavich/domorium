## 1. The range in the service

- [x] 1.1 Add `CompletionTextEdit` (`newText`, `insert`, `replace`) and a required `textEdit` on `CompletionItem` in `packages/language-service/src/types.ts`; in `src/libs/completion/completion.ts`, compute the token from the full line, calendar escape first, and set `textEdit` on every item; have `GedcomLanguageService.getCompletionItems` pass the line text. Verify with tests written first in `completion.test.ts`, one per scenario of `language-service/completion-range`, replacing the assertion that no `insertText` is set, then `npm run typecheck`
- [x] 1.2 Rebuild with `npm run build -w packages/language-service`. Verify that `dist/index.d.ts` declares `textEdit`

## 2. The server

- [x] 2.1 In `packages/language-server/src/createServer.ts`, record `insertReplaceSupport` from `initialize` with optional chaining (absent = unsupported) and map each item's `textEdit` to an `InsertReplaceEdit` or a `TextEdit` over `replace`. Verify with tests in `stdio.test.ts` for both scenarios of `language-server/completion-edit`, one of them initializing with no capabilities

## 3. CodeMirror

- [x] 3.1 In `packages/codemirror/src/extensions.ts`, take `from` from `insert.start` and give each option an `apply` that dispatches `insertCompletionText` up to the replace end with `pickedCompletion`; set no `validFor`; leave the opening guard as it is. Verify with tests in `packages/codemirror/src/extensions.test.ts` that run the source and each option's `apply` against an `EditorState`, one per scenario of `codemirror/completion-apply`
- [x] 3.2 Rebuild with `npm run build -w packages/codemirror`, and record in its CHANGELOG that its release raises the `@domorium/language-service` floor to the release that ships `textEdit`; the floor itself moves in that release PR, as it has every time (`5ac52a6`, `cfb7765`). Verify that `dist` builds

## 4. Documentation

- [x] 4.1 `packages/language-service/README.md` and `packages/codemirror/README.md`: say what `textEdit` means and how the editor uses it, and check every name in their usage examples still exists. Verify with `npm run check:docs`
- [x] 4.2 `## Unreleased` entries naming #468 in `packages/language-service/CHANGELOG.md` (the new field), `packages/codemirror/CHANGELOG.md` (the fix and the raised floor) and `apps/vscode/CHANGELOG.md` (the fix as a user sees it). Verify with `npm run check:docs` and by checking each entry names a scenario the tests cover

## 5. Release

- [ ] 5.1 In the release PR that ships this, raise `@domorium/language-service` in `packages/codemirror/package.json` to the version that ships `textEdit`, and validate `@domorium/codemirror` from an `npm pack` tarball in a clean consumer locked to the older `@domorium/language-service`. Verify that `npm install` there refuses the old one or resolves the new one

## 6. Gate

- [x] 6.1 Run `npm run check`; record whether `check:jetbrains` ran or was skipped for lack of a JDK. Ran: 1455 tests, and `check:jetbrains` ran with a JDK
