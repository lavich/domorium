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

`stringWordTest` (`@codemirror/search` `dist/index.js:625-635`) rejects a match
whose edge character and its neighbour are both word characters, so a
whole-word search for `I1` stops matching inside `@I1@`. The web editor installs
`highlightSelectionMatches` and `searchKeymap`
(`apps/web-editor/src/editor/createGedcomEditor.ts:169-170`); Obsidian installs
`search()` (`domorium-obsidian/src/editor/hostExtensions.ts:46`).

**JetBrains.** `GEDCOM` is a `LanguageFileType` on `PlainTextLanguage`
(`apps/jetbrains/src/main/kotlin/domorium/jetbrains/GedcomFileType.kt:17`,
`plugin.xml:190-194`). Read from the IntelliJ 2024.2 SDK the plugin builds
against (`build.gradle.kts`, `IC 2024.2`; `lib/app-client.jar`, `lib/app.jar`,
with `javap -c -p`) and from LSP4IJ 0.20.1 (`lsp4ij-0.20.1.jar`):

- The PSI under the caret is not reliably `PsiPlainText`. LSP4IJ registers
  `<lang.fileViewProviderFactory language="TEXT">`
  (`LSPSemanticTokensStructurelessFileViewProviderFactory`, its
  `META-INF/plugin.xml:439`) for files it maps; where a semantic token covers
  the offset, `findElementAt` answers an `LSPSemanticTokenPsiElement`, and the
  server sends a `variable` token for every POINTER and XREF
  (`packages/language-service/src/libs/semantic/semanticTokens.ts:52-53`).
  Without tokens — in a test, or before the server answers — it is
  `PsiPlainText`.
- Double-click calls `EditorImpl.selectWordAtCaret` (`EditorImpl$MyMouseAdapter`),
  which reaches `CaretImpl.selectWordAtCaret`; that runs the `EditorSelectWord`
  handler, turning CamelHumps off for the call unless the setting asks
  otherwise. Extend Selection (Ctrl+W, ⌥↑) is the same action, so both go
  through `SelectWordHandler`, which runs for each caret
  (`EditorActionHandler$ForEachCaret`).
- `SelectWordHandler.doSelectWord` collects candidate ranges through
  `SelectWordUtil.processRanges` and keeps the smallest one that strictly
  contains the current selection (`lambda$doSelectWord$2`).
  `UnSelectWordHandler` (Shrink Selection) collects through the same
  `processRanges`.
- `processRanges` walks from the leaf at the caret up through its parents
  while the element is not a `PsiFile`, and stops at the first element for
  which some range was accepted (`lambda$processInFile$1`).
- For each element, `SelectWordUtil.processElement` asks every
  `ExtendWordSelectionHandler` whose `canSelect(element)` is true. It first
  takes the largest `getMinimalTextRangeLength(element, text, cursorOffset)`
  among those extending `ExtendWordSelectionHandlerBase`, and drops every
  range, from any handler, shorter than that. The extension point is declared
  `dynamic="true"` (`META-INF/EditorExtensionPoints.xml:17`).
- The handlers on a GEDCOM leaf: `PlainTextLineSelectioner`,
  `NaturalLanguageTextSelectioner` (both `ExtendWordSelectionHandlerBase`) and
  `WordSelectioner` (`META-INF/LangExtensions.xml:785-787`), and LSP4IJ's
  `LSPCodeBlockExtendWordSelectionHandler` and `LSPExtendWordSelectionHandler`
  (`order="first"`, its `plugin.xml:431-432`). LSP4IJ's
  `basicWordSelectionFilter` `LSPWordSelectionFilter` (`:433`) switches
  `WordSelectioner` off once the server offers selection ranges
  (`LSPSelectionRangeSupport.isSelectionRangesAvailable`); the GEDCOM server
  offers none today (#153).
- `WordSelectioner` adds the word or CamelHumps range from
  `SelectWordUtil.addWordOrLexemeSelection`, which splits at any character that
  is not a Java identifier part — so `I1` inside `@I1@`.
- `SelectWordHandler.adjustCaretOffset` moves an offset at the end of a line,
  or before whitespace, onto the character before it, so a caret just after
  `@I1@` there is handled as on its closing `@`. Before `)` it is not.
- Word movement and word deletion are editor actions whose handlers can be
  wrapped. `<extensionPoint name="editorActionHandler"
beanClass="…EditorActionHandlerBean" dynamic="true">` (`app.jar`
  `META-INF/IdeaPlugin.xml:3502`); `DynamicEditorActionHandler.getHandlerChain`
  builds each registered handler through a constructor taking the previous
  `EditorActionHandler`, and the last in the chain runs. The platform does this
  itself: `<editorActionHandler action="EditorDeleteToWordStart"
implementationClass="…BackspaceToWordStartHandler"/>` (`:5981`), a
  `BackspaceHandler` that consults its delegates and otherwise calls
  `myOriginalHandler.execute`.
- The action ids, declared in `META-INF/IdeaPlugin.xml:412-423`:
  `EditorNextWord`, `EditorNextWordWithSelection`,
  `EditorNextWordInDifferentHumpsMode`,
  `EditorNextWordInDifferentHumpsModeWithSelection`, `EditorPreviousWord`,
  `EditorPreviousWordWithSelection`, `EditorPreviousWordInDifferentHumpsMode`,
  `EditorPreviousWordInDifferentHumpsModeWithSelection`,
  `EditorDeleteToWordStart`, `EditorDeleteToWordStartInDifferentHumpsMode`,
  `EditorDeleteToWordEnd`, `EditorDeleteToWordEndInDifferentHumpsMode`. Select
  and Shrink Selection are `EditorSelectWord` and `EditorUnSelectWord`
  (`IdeActions.ACTION_EDITOR_SELECT_WORD_AT_CARET`, `ACTION_EDITOR_UNSELECT_WORD_AT_CARET`).

`semantic-range-requests`, open in its own worktree, changes how the server
offers semantic tokens; it leaves LSP4IJ on `full` requests, so the PSI above
is the same with or without it. The two changes share no file and may archive
in either order.

## Goals / Non-Goals

**Goals:** the requirements in `specs/codemirror/word-characters/spec.md` and
`specs/jetbrains/xref-word/spec.md`.

**Non-Goals:** dragging after a double-click in JetBrains, which still extends
by the platform's character words; a GEDCOM `Language`, lexer or highlighter
for JetBrains; anything in VS Code; changing what completion replaces.

## Decisions

### CodeMirror: `@` in `wordChars`, from `createGedcomExtensions`

`EditorState.languageData.of(() => [{ wordChars: "@" }])` joins the preset's
extensions. It belongs to the GEDCOM preset rather than to
`createStandaloneEditorExtensions`, because it says what a word is in GEDCOM,
and because an embedding host may compose the preset without the standalone
shell. The provider ignores position: the preset is installed in a GEDCOM
document and nothing else.

Alternative considered: a custom double-click and keymap overriding
`cursorGroup*` to take `@…@` only. It would spare e-mail addresses but replace
three CodeMirror behaviours with ours; the user chose the VS Code trade.

### JetBrains: one xref finder

A small Kotlin function finds the xref on the caret's line containing an
offset, matching `@[A-Za-z0-9_]+@` left to right, as VS Code's word pattern
does; `a@@b@@c` therefore yields `@b@`, and `@@I1@@` yields `@I1@`, which the
spec accepts. The expression is the lexer's, restated: the plugin has no
TypeScript at run time, and an editor's notion of a word is host text handling,
as the VS Code word pattern is, not genealogy logic. Every handler below asks
first whether the editor's file is a GEDCOM file and leaves anything else to
the platform. The action handlers find the file through
`FileDocumentManager.getInstance().getFile(editor.document)`, not
`editor.virtualFile`, which is null for an editor made by
`EditorFactory.createEditor(document, project)`; the selection handler asks the
PSI element's containing file.

### JetBrains selection: an `ExtendWordSelectionHandlerBase` that raises the minimum

Registered as `<extendWordSelectionHandler>`:

- `canSelect(element)` is true when the element's containing file is a GEDCOM
  file — never a test on `PsiPlainText`, since the leaf is often LSP4IJ's
  semantic-token element. As `processRanges` never reaches the `PsiFile`, only
  the leaf (and any non-file parent) is asked.
- `getMinimalTextRangeLength` returns the length of the xref containing
  `cursorOffset`, or 0. This drops `I1` and CamelHumps pieces from
  `WordSelectioner` without touching any handler's ranges at or above that
  length, and applies equally to Shrink Selection.
- `select` returns the xref's range, or an empty list; it does not call the
  base `select`, whose element-wide ranges the other handlers already supply.

Alternatives considered: a `basicWordSelectionFilter` switching
`WordSelectioner` off for GEDCOM and re-supplying every word range — more code,
and it would have to reproduce CamelHumps and lexeme words; and a
`CharCondition` admitting `@` — it would join `john@example.com`, which the
user excluded for JetBrains.

### JetBrains movement and deletion: wrapping editor action handlers

Twelve `<editorActionHandler action="…">` registrations, one per action id
above. Each class takes the original handler in its constructor, as the bean
requires; two abstract bases hold the logic, so each registered class only
names its direction and whether it extends the selection.

- Both bases extend the `ForEachCaret` form (`EditorActionHandler.ForEachCaret`,
  `EditorWriteActionHandler.ForEachCaret`):
  `DynamicEditorActionHandler.runForAllCarets` asks only the outermost handler,
  so the wrapper must say so itself. `isEnabledForCaret` is passed through to
  the original handler, and the original is called with the same caret.
- Movement: outside a GEDCOM file, call the original. Inside one, if the caret
  is strictly inside an xref, move it to the xref's edge in the direction of
  travel; otherwise call the original, and if the caret then stands strictly
  inside an xref, move it on to that edge. When the plugin moves the caret
  itself, the plain variants remove the selection; the extending variants take
  the caret's lead selection offset before the move and select from it to the
  new offset. Either way it then scrolls to the caret, as
  `EditorActionUtil.moveCaretToNextWord` does. The CamelHumps variants share
  the same base: an xref is never split by humps.
- Deletion: with a selection, call the original — the platform's
  `DeleteToWordBoundaryHandler` deletes the selection first
  (`EditorModificationUtil.deleteSelectedText`). Without one, backward with the
  caret in `(start, end]` of an xref deletes `[start, caret)`, forward with the
  caret in `[start, end)` deletes `[caret, end)`, and both first set
  `CommandProcessor.setCurrentCommandGroupId(EditorActionUtil.DELETE_COMMAND_GROUP)`
  and call `CopyPasteManager.stopKillRings()`, as the platform handler does, so
  undo groups alike. Otherwise call the original, which keeps
  `BackspaceToWordStartHandler` and its delegates in the chain.
- A mistyped action id fails silently: `DynamicEditorActionHandler` keeps only
  beans whose `action` names its own id. One parameterised test runs all twelve
  ids over `1 HUSB @I1@`.

Alternatives considered: re-implementing the platform's caret stops for every
word — the delegation keeps its caret-stop settings for all text but xrefs; and
a GEDCOM `Language` with a lexer — `isLexemeBoundary` can only add stops, never
remove the one at `@`, and a lexer would compete with LSP4IJ's semantic tokens.

### Tests

- CodeMirror, in `packages/codemirror/src`: `EditorState.create` with
  `createGedcomExtensions` alone for `wordAt`, a state without the preset for
  the control, and a jsdom `EditorView` (`// @vitest-environment jsdom`, as
  `standaloneExtensions.test.ts`) for `cursorGroupForward`,
  `deleteGroupBackward`, `SearchQuery` with `wholeWord` and
  `selectNextOccurrence`. One completion test in a state built from the preset:
  the existing ones (`extensions.test.ts:182-235`) use a bare `EditorState` and
  cannot see the change.
- JetBrains, `BasePlatformTestCase`: the file comes from
  `myFixture.addFileToProject("a.ged", …)` and the editor from
  `EditorFactory.getInstance().createEditor(document, project)`, released in a
  `finally`. `configureByText` would open the file through
  `TestEditorManagerImpl`, whose `fileOpened` reaches LSP4IJ's
  `ConnectDocumentToLanguageServerSetupParticipant` and starts the server — the
  thread leak fixed in #434. Carets and selections are set with
  `EditorTestUtil.setCaretsAndSelection`; double-click is
  `caret.selectWordAtCaret(false)`, and every other action runs through
  `EditorTestUtil.executeAction(editor, id)`, so the whole handler chain is
  exercised. Each test asserts no server started, as
  `GedcomRuntimeIntegrationTest` does. A plain-text control runs the same
  action on `a.txt`. `FileDocumentManager` finds the virtual file of a
  document from `addFileToProject`, so the handlers see the GEDCOM file type
  in the test as in the IDE. These tests see a `PsiPlainText` leaf only; the
  semantic-token leaf is covered by the manual check in the sandbox IDE, with
  the server running.

The behaviour decision lives in the two specs; it needs no ADR (ADR-0018).

## Risks / Trade-offs

- [Double-clicking an e-mail address in the web editor or Obsidian selects
  `john@example`; `@#DJULIAN@` double-clicks as `DJULIAN@`; a whole-word search
  for `I1` misses `@I1@`] → accepted by the user, identical to VS Code for the
  first two; the changelog names all three.
- [`charCategorizer` reads only the first `wordChars` value] → a host that
  declares its own word characters ahead of the preset would win. Neither host
  does; the README says the preset declares `@`, so a host can tell.
- [If the server ever offers selection ranges (#153), `LSPWordSelectionFilter`
  switches `WordSelectioner` off and LSP4IJ supplies the word ranges] → the
  minimum length still drops anything narrower than the xref, but the ranges
  will be the server's; #153 must keep an xref one range, and its tests should
  include these scenarios.
- [Another plugin wraps the same actions] → each wrapper delegates what is not
  an xref, so the chain composes; the order among wrappers is the platform's.
- [Neither host is exercised inside its real application by the tests] → the
  PR leaves manual checks: the web editor, the sandbox IDE with the server
  running, and Obsidian once it depends on the release.

## Implementation

- An xref before `)` in `1 NOTE (@I1@)`: the plugin offers nothing there, but
  the platform's `NaturalLanguageTextSelectioner` takes the bracketed text,
  which is `@I1@`, in a `.txt` file as in a `.ged` one. The scenario says so,
  and the test checks that the finder answers nothing at `)` and that the
  selection matches the plain text file's.
- CodeMirror's tests live in `packages/codemirror/src/wordCharacters.test.ts`.
  `selectNextOccurrence` adds a range only where
  `EditorState.allowMultipleSelections` is on, as both hosts' editors have it;
  the test state turns it on.
- The JetBrains tests are one class, `GedcomXrefWordTest`. A selection is
  compared by its range, not by which end the caret is at. The e-mail cases run
  each action from every position of the line and compare the `.ged` result
  with the `.txt` one.
- The feature line went into the plugin's `<description>` in `plugin.xml` as
  well as its README, as both list the features.
