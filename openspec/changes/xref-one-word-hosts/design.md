## Context

See proposal.md — Why. The VS Code side is
`openspec/changes/archive/2026-10-27-vscode-language-configuration/`: a word
pattern that tries `@[A-Za-z0-9_]+@` first, and `editor.wordSeparators` without
`@` (`apps/vscode/language-configuration.json`). Under those separators
`@#DJULIAN@` double-clicks as `DJULIAN@`; under the word pattern the calendar
escape is not an xref, as `#` is not in the class.

An xref, to every host, is the validator lexer's token: `@[A-Za-z0-9_]+@`
(`packages/validator/src/parser/lexer.ts:76`, `:93`). `@VOID@` is one.

**CodeMirror.** `@domorium/codemirror` defines no `Language`; the preset is
`createGedcomExtensions` (`packages/codemirror/src/extensions.ts:615-636`), which
the web editor (`apps/web-editor/src/editor/createGedcomEditor.ts:128`) and the
Obsidian plugin (`domorium-obsidian/src/editor/composition.ts:115`) both compose,
each beside `createStandaloneEditorExtensions`. In `@codemirror/state` 6.7.6,
`charCategorizer(at)` reads the first `wordChars` value from the
`EditorState.languageData` facet (`dist/index.js:2847-2850`) and `wordAt` walks
it (`:2857-2874`). Readers of the categorizer: double-click
(`groupAt`, `@codemirror/view` `dist/index.js:3631`), word movement
(`byGroup`, `:3726`), word deletion and `cursorGroup*` (`@codemirror/commands`
`dist/index.js:658,680,1255`), `selectNextOccurrence` and whole-word search
(`@codemirror/search` `dist/index.js:428-501,620,694`), and `closeBrackets` and
`completeAnyWord` in `@codemirror/autocomplete` (`:1784,1988,2029`), which the
preset does not install. Neither host declares `wordChars` today.

Completion does not read word boundaries: `completionSource` matches with its
own expression (`extensions.ts:161`), takes `from` from the service's `insert`
range and writes over its `replace` range (`:177-199`); the result carries no
`validFor`, and `@codemirror/autocomplete` filters with its fuzzy matcher, not
the categorizer.

**JetBrains.** `GEDCOM` is a `LanguageFileType` on `PlainTextLanguage`
(`apps/jetbrains/src/main/kotlin/domorium/jetbrains/GedcomFileType.kt:17`,
`plugin.xml:190-194`), so a `.ged` file's PSI is plain text. Read from the
IntelliJ 2024.2 SDK the plugin builds against (`build.gradle.kts`, `IC 2024.2`;
`lib/app-client.jar`, with `javap -c -p`):

- Double-click calls `EditorImpl.selectWordAtCaret`
  (`EditorImpl$MyMouseAdapter`), which reaches `CaretImpl.selectWordAtCaret`;
  that runs the `EditorSelectWord` action handler, turning CamelHumps off for
  the call unless the setting asks otherwise. Extend Selection (Ctrl+W, ⌥↑) is
  the same action, so both go through `SelectWordHandler`.
- `SelectWordHandler.doSelectWord` collects candidate ranges through
  `SelectWordUtil.processRanges` and keeps the smallest one that strictly
  contains the current selection (`lambda$doSelectWord$2`).
- `SelectWordUtil.processElement` asks every `ExtendWordSelectionHandler`
  (extension point `com.intellij.extendWordSelectionHandler`, declared
  `dynamic="true"` in `META-INF/EditorExtensionPoints.xml:17`, with
  `WordSelectioner` registered in `META-INF/LangExtensions.xml:787`) whose
  `canSelect(element)` is true, for the element at the caret and each parent.
  It first takes the largest `getMinimalTextRangeLength(element, text,
cursorOffset)` among those that extend `ExtendWordSelectionHandlerBase`, and
  drops every range, from any handler, shorter than that.
- `WordSelectioner` (`AbstractWordSelectioner`) adds the word or CamelHumps
  range from `SelectWordUtil.addWordOrLexemeSelection`, which splits at any
  character that is not a Java identifier part — so `I1` inside `@I1@`.
- `SelectWordHandler.adjustCaretOffset` moves an offset at the end of a line,
  or before whitespace, onto the character before it, so a caret just after
  `@I1@` is handled as on its closing `@`.
- Word movement and deletion go through `EditorActionUtil`: `isWordStart` and
  `isWordEnd` are by character, and `isLexemeBoundary` adds stops from the
  editor highlighter's tokens, filtered by `LanguageWordBoundaryFilter`, which
  is keyed by the token's `Language` and sees only two token types. Nothing
  there takes a file type or can remove a character stop.

## Goals / Non-Goals

**Goals:** the requirements in `specs/codemirror/word-characters/spec.md` and
`specs/jetbrains/xref-selection/spec.md`.

**Non-Goals:** JetBrains word movement and deletion; a GEDCOM `Language`, lexer
or highlighter for JetBrains; anything in VS Code; changing what completion
replaces.

## Decisions

### CodeMirror: `@` in `wordChars`, from `createGedcomExtensions`

`EditorState.languageData.of(() => [{ wordChars: "@" }])` joins the preset's
extensions. It belongs to the GEDCOM preset rather than to
`createStandaloneEditorExtensions`, because it says what a word is in GEDCOM,
and because an embedding host may compose the preset without the standalone
shell. The provider ignores position: the preset is installed in a GEDCOM
document and nothing else.

Alternative considered: a custom double-click (`EditorView.mouseSelectionStyle`)
and keymap overriding `cursorGroup*` to take `@…@` only. It would spare e-mail
addresses, but replaces three CodeMirror behaviours with ours; the user chose
the VS Code trade instead.

### JetBrains: an `ExtendWordSelectionHandlerBase` that raises the minimum

A handler registered as `<extendWordSelectionHandler>` in `plugin.xml`:

- `canSelect(element)` is true for any element of a file whose type is
  `GedcomFileType` — the plain-text leaf and the file above it, since
  `processRanges` asks at each level and `WordSelectioner` would otherwise offer
  `I1` again at the file.
- It finds the xref containing `cursorOffset` by matching
  `@[A-Za-z0-9_]+@` left to right over the caret's line, as VS Code's word
  pattern does.
- `getMinimalTextRangeLength` returns that xref's length, or 0 when the caret is
  not on one; this is what drops `I1` and CamelHumps pieces without touching
  any other handler's ranges outside the xref.
- `select` returns the xref's range, or an empty list; it does not call the
  base `select`, whose element-wide ranges `WordSelectioner` already supplies.

Alternatives considered: a `com.intellij.basicWordSelectionFilter` condition
switching `WordSelectioner` off for GEDCOM, and the handler re-supplying every
word range — more code, and it would have to reproduce CamelHumps and lexeme
words; and passing `SelectWordUtil.addWordSelection` a `CharCondition` that
admits `@` — it would join `john@example.com`, which the user excluded for
JetBrains.

The xref expression is the lexer's, restated in Kotlin: the plugin has no
TypeScript at run time, and an editor's notion of a word is host text handling,
as the VS Code word pattern is, not genealogy logic.

### Word movement in JetBrains stays a known gap

No extension point reaches it for a plain-text file type (see Context). A
GEDCOM `Language` with a lexer would only add stops, never remove the one at
`@`, and would compete with LSP4IJ's semantic tokens. The README says so, and
#467 records it when the change lands.

### Tests

- CodeMirror (`packages/codemirror/src/wordCharacters.test.ts`, or beside the
  preset in `extensions.test.ts`): `EditorState.create` with
  `createGedcomExtensions` alone, `state.wordAt` for each scenario, and a
  state without the preset for the control. Movement and deletion in a jsdom
  `EditorView` (`// @vitest-environment jsdom`, as
  `standaloneExtensions.test.ts`) with `cursorGroupForward` and
  `deleteGroupBackward` from `@codemirror/commands`.
- JetBrains (`GedcomXrefSelectionTest : BasePlatformTestCase`):
  `myFixture.configureByText("a.ged", "1 HUSB @I<caret>1@")`, then both
  `editor.caretModel.currentCaret.selectWordAtCaret(false)` — the double-click
  path — and `myFixture.performEditorAction(IdeActions.ACTION_EDITOR_SELECT_WORD_AT_CARET)`,
  reading `editor.selectionModel.selectedText`; each scenario of the spec,
  including `a.txt` as the control.

The behaviour decision lives in the two specs; it needs no ADR (ADR-0018).

## Risks / Trade-offs

- [Double-clicking an e-mail address in the web editor or Obsidian selects
  `john@example`; `@#DJULIAN@` double-clicks as `DJULIAN@`] → accepted by the
  user, and identical to VS Code; the changelog says so.
- [`charCategorizer` reads only the first `wordChars` value] → a host that
  declares its own word characters ahead of the preset would win. Neither host
  does; the README says the preset declares `@`, so a host can tell.
- [Opening a `.ged` file in a platform test may start the GEDCOM server through
  LSP4IJ, and a leaked process thread fails the suite] → the test asserts no
  server started, as `GedcomRuntimeIntegrationTest` does; if one starts, build
  the editor from `PsiFileFactory` and `EditorFactory` instead of
  `configureByText`.
- [JetBrains word movement still stops at `@`] → a known gap, in the README and
  #467.
- [Neither host is exercised inside its real application by the tests] → the
  PR leaves manual checks: the web editor (`npm run dev -w apps/web-editor`),
  and the sandbox IDE (`./gradlew runIde`); Obsidian once it depends on the
  release.
