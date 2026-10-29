No dependency on another open change.

## 1. CodeMirror

- [ ] 1.1 Write the tests for every scenario of `specs/codemirror/word-characters/spec.md` in `packages/codemirror/src` — `wordAt` in states built from `createGedcomExtensions` alone and without it, and word movement and deletion in a jsdom `EditorView` with `cursorGroupForward` and `deleteGroupBackward`; verify with `npx vitest run packages/codemirror` that the xref scenarios fail before 1.2.
- [ ] 1.2 Add `EditorState.languageData.of(() => [{ wordChars: "@" }])` to `createGedcomExtensions` in `packages/codemirror/src/extensions.ts`; verify the 1.1 tests pass, and that the completion tests in `extensions.test.ts` (the `codemirror/completion-apply` scenarios) pass unchanged.
- [ ] 1.3 Say in `packages/codemirror/README.md`, beside `createGedcomExtensions`, that the preset declares `@` a word character, and add a `## Unreleased` entry to `packages/codemirror/CHANGELOG.md` naming the e-mail and `@#DJULIAN@` cases (#467); verify `npm run check:docs` passes.
- [ ] 1.4 Rebuild with `npm run build -w packages/codemirror`, run `npm run dev -w apps/web-editor`, and check by hand in the browser that double-clicking `@I1@` selects it whole, that Alt/Ctrl+→ and Alt/Ctrl+Backspace cross it in one step, and that completing inside `1 HUSB @I` still writes `@I1@`; record the result in the PR.

## 2. JetBrains

- [ ] 2.1 Write `apps/jetbrains/src/test/kotlin/domorium/jetbrains/GedcomXrefSelectionTest.kt` (`BasePlatformTestCase`) covering every scenario of `specs/jetbrains/xref-selection/spec.md` through both `selectWordAtCaret(false)` and `performEditorAction(IdeActions.ACTION_EDITOR_SELECT_WORD_AT_CARET)`, with `a.txt` as the control and an assertion that no language server started; verify with `./apps/jetbrains/gradlew -p apps/jetbrains test --tests '*GedcomXrefSelectionTest'` (JDK 17) that the xref scenarios fail before 2.2.
- [ ] 2.2 Add the selection handler described in design.md under `apps/jetbrains/src/main/kotlin/domorium/jetbrains/` and register it as `<extendWordSelectionHandler>` in `plugin.xml`; verify the 2.1 tests and the existing suite pass with `npm run check:jetbrains`.
- [ ] 2.3 Add to the Features of `apps/jetbrains/README.md` that double-click and Extend Selection take an xref whole, and name as a known gap that moving or deleting by word still stops at each `@`; leave `<change-notes>` in `plugin.xml` to the release, which writes it; verify `npm run check:docs` passes.
- [ ] 2.4 Run `./gradlew runIde` in `apps/jetbrains` and check by hand in the sandbox IDE that double-click and Ctrl+W (⌥↑) on `@I1@` select it whole, that `john@example.com` double-clicks as `john`, and that Alt+→ still stops at `@`; record the result in the PR.

## 3. Gate

- [ ] 3.1 Comment on #467 that JetBrains word movement remains a known gap and why, when the PR is opened; verify the comment exists.
- [ ] 3.2 Run `npm run check`; record whether `check:jetbrains` ran with JDK 17 or was skipped for lack of a JDK.
