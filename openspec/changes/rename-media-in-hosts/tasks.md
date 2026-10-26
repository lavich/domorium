Archive order: `file-link-move-refusal` (#452) before this change.

## 1. Server

- [x] 1.1 Add the path arithmetic to `packages/language-server`: a folder URI and a file URI to a plain relative path, or nothing across schemes, authorities or a folderless scheme. Verify with unit tests first: same folder, a subfolder, a parent giving `..`, percent-encoded segments decoded, `file:///c%3A/` against `file:///C:/`, different schemes, `untitled:`
- [x] 1.2 Register `workspace.fileOperations.willRename` for files, and answer `workspace/willRenameFiles` over `documents.all()` with `moveFileLinks`, reusing `cache` only at the document's version, the new folder taken from the same event when the document moves. Skip a pair whose `from` equals its `to`. Verify over the LSP wire in `stdio.test.ts`: the initialize result carries the registration, and each scenario of the first requirement of `language-server/file-rename` gives its answer, the closed document included
- [x] 1.3 Leave refused documents out and send one `window/showMessage` Warning naming them by path relative to their workspace folder. Verify in `stdio.test.ts` with the GEDCOM 7 and 5.5.1 scenario

## 2. Closed files

- [x] 2.1 Add `mentionsFile(text, path)` to `@domorium/language-service` beside `decodeFileTarget`, exported, with a README line and its `Unreleased` changelog entry. Verify with Vitest first, one test per scenario of `language-service/file-mention`
- [x] 2.2 Add a module in `apps/vscode` without a `vscode` import that decodes bytes (UTF-16 by byte-order mark, else UTF-8) and counts the texts mentioning any of a set of renamed files, and a scan state that restarts with the union of names when a rename arrives mid-scan. Verify with Vitest: UTF-8, UTF-16LE with BOM, several files in one rename counted once per closed file, a second rename keeping the first's names
- [ ] 2.3 Listen to `workspace.onDidRenameFiles` in the client: drop folders by `stat`, exclude `workspace.textDocuments` with language `gedcom`, scan without blocking, warn once when the count is not zero. Add `workspaceContains:**/*.gedcom` to activation. Verify by building the extension (`npm run build -w apps/vscode`) and by the manual check in 3.3

## 3. Hosts and documentation

- [ ] 3.1 In the JetBrains sandbox IDE, rename a photograph named by an open tree and see it rewritten; record under Implementation in design.md whether it was, and whether one undo reverts both. Correct the proposal's host list if it was not
- [ ] 3.2 `apps/vscode/README.md` (done) and, after 3.1, `apps/jetbrains/README.md`: the feature and its known gaps. Host changelogs are written by the release PR. Verify with `npm run check:docs`
- [ ] 3.3 Manual check in VS Code with the built extension: rename a photograph from the Explorer that is named by an open and a closed tree; see the open one rewritten, Explorer undo revert both, and one warning about the closed one. Record it in the PR
- [x] 3.4 File one issue for each known gap listed under Non-Goals in design.md, and link them from the PR

## 4. Gate

- [ ] 4.1 Rebuild `packages/language-service` and `packages/language-server`, then run `npm run check`; record whether `check:jetbrains` ran or was skipped for lack of a JDK
