# Changelog

All notable changes to `@domorium/codemirror` are documented here.

## Unreleased

- **A host reading document symbols through this package can name them.**
  `getDocumentSymbols` was reachable, `DocumentSymbol` was not, and
  `DocumentSymbolKind` is an enum rather than a type, so its members could only be
  compared as the numbers they happen to be. Both are re-exported now, beside the
  `Range` and `WorkspaceEdit` that already were. This does not remove a host's need
  to depend on `@domorium/language-service` directly — `GedcomLanguageService`
  itself lives there, and so do `Diagnostic`, `InlayHint`, `SemanticToken` and
  `semanticTokenLegend`. See lavich/domorium-obsidian#71, which named this gap and
  left it for whichever release came next.

## 2.0.0 - 2026-08-20

Carries `@domorium/language-service` 2.0.0 and, through it, `@domorium/validator`
2.0.0. This package re-exports `GedcomDocument`, so the three members that version
removes — `updateDocument`, `xRefs` and the public `pointers` — are gone from here
as well, and `getErrors` and `getNodes` no longer accept the arguments they never
read. Nothing in this package's own surface changed.

Everything the two carry arrives with it: a hover below a line with no tag answers
instead of throwing, a document of more than 125k diagnostics reports all of them,
a tag typed in lower case is completed, a completion on a large document is
answered in under a millisecond, and a 5.5.1 date is read against the calendar its
escape names.

## 1.5.1 - 2026-08-15

- **The editor installs again beside a host that carries its own CodeMirror.**
  The peer range for `@codemirror/view` had been narrowed to `^6.43.8` by a
  dependency bump, and nothing in the package needs a version that new. A host
  pinned to what it ships — an Obsidian plugin is pinned to 6.38.6 — could not
  resolve 1.4.0 or 1.5.0 at all.

## 1.5.0 - 2026-08-15

- **A link carries only the class its host's highlight style mints** for `url` or
  `link`, so both its name and its look are the host's: a web address is
  `tags.url`, a file is `tags.link`, and `documentLinkTag(kind)` is that mapping,
  exported beside `semanticTokenTag`. A style that names no class for those tags
  gets no decoration rather than a `gedcom-link` of ours, and a host that wants a
  name of its own writes `{ tag, class }` — which is also the only way to reach a
  state a highlight style cannot state, `:hover` among them.
- **`variable` maps to `tags.variableName`**, the type the legend now gives an
  identifier. A tag arrives as `tags.keyword` and a payload as `tags.string`,
  which is the same mapping as before by name and a different one by meaning —
  see `@domorium/language-service`.
- **A declaring token carries a modified tag**, `tags.definition` over the tag its
  type maps to, so what a declaration looks like is stated in the host's highlight
  style beside every other colour. `semanticTokenTag(type, modifiers)` is that
  mapping; the stable `gedcom-token-declaration` class is still applied, as the
  name the legend gives rather than as a look. The modifier **adds** to the tag
  rather than replacing it: a highlight style answers with one class per tag — the
  most specific rule it holds — so a host stating only a weight for
  `definition(keyword)` keeps the colour it stated for `keyword` underneath.
- **The occurrences of the identifier under the caret are no longer painted.**
  `gedcom-reference-read` and `gedcom-reference-write` are gone, and so is the
  decoration behind them: in a file where a record and the pointers to it sit
  hundreds of lines apart, the marks were rarely both on screen, and the question
  they answered is answered better by go to definition and find references.
  `getReferenceHighlightSpecs` still says where the occurrences are, for a host
  that wants to mark them, and `getDocumentHighlights` keeps its `kind` — an LSP
  host renders read and write itself.
- **The hover tooltip's own `gedcom-hover` class is gone.** CodeMirror already
  marks a hover tooltip `cm-tooltip-hover`, which is what the base theme sizes
  and what a host should dress; a second name for the same box said nothing.
- **The base theme no longer says what a link looks like.** Its two classes
  outweighed the one a highlight style mints, so a host stating a decoration or
  a cursor of its own was overridden by the default underneath. The mark is
  still applied; the whole appearance is the host's.

## 1.4.0 - 2026-08-14

- **A web address and a file path are marked as links.** Both had been openable
  with Ctrl/Cmd-click since they were added, and neither looked like anything: a
  reader had no way to tell there was something to click. They now carry
  `gedcom-link` and `gedcom-link-<kind>` — `http`, `file-relative`,
  `file-absolute` — underlined by the base theme, which is the one cue the
  syntax highlighting does not already use.
- `getDocumentLinkSpecs(state, language)` answers with the same offsets, for a
  host that wants them.
- **A token in the editor now carries `gedcom-token-<type>` as well as the class
  its `HighlightStyle` mints.** The minted one is generated per build and cannot
  be named in a stylesheet, so a host that keeps its colours in CSS had to state
  them a second time as a `HighlightStyle` — and a host rendering GEDCOM outside
  the editor, where there is no editor state to mint from, spelt the same names
  by hand. `tokenClass(tokenType)` is that spelling, exported.

## 1.3.0 - 2026-08-12

- **The host chooses what opens a record preview and when it closes.** `trigger`
  answers whether an event asks for one and defaults to the platform modifier, so
  a host whose users configure that gesture can honour their setting instead of
  being overridden. `clearRecordPreview(view)` closes an open preview from
  anywhere — a file rewritten underneath the view, a command running, a modifier
  released where the editor never saw it — and `hide` is called for it.
- `hoveredPointer(state)` reads which pointer a preview is open on.
- **A hover follows the glyph the pointer is over, not the boundary beside
  it.** Pointing at the space after a tag showed that tag's tooltip, because
  the left half of the space and the right half of the tag are one position.
  A caret is a boundary and a pointer is over a character; only the host is
  told which, so `pointerOnRange` is where that is decided.
- Requires `@domorium/language-service` 1.3.0 or newer: `EditorLanguageService`
  passes parse options through to it, and an older one ignores them in silence.

## 1.2.0 - 2026-08-11

- **A cross-reference can be read without leaving the line it is on.** Hold the
  modifier and point at `@F1@` and the record it names appears, painted with the
  host's own highlight classes rather than as flat text — the preview looks like
  the editor it came from, and costs a handful of runs rather than a second
  editor. `recordPreviewHover` installs the gesture and marks the pointer;
  `show` and `hide` stay with the host, because a tooltip and a popover are
  different surfaces. `findRecordPreview` and `getRecordPreviewRuns` are there
  for a host that wants the pieces instead.
- `createStandaloneEditorExtensions` takes a `diagnostics` option. A host that
  hides diagnostics had to restate the whole preset to drop one gutter from it,
  and nothing detected the two lists drifting apart.
- **The underline under a marked declaration no longer breaks under its
  delimiters.** `gedcom-reference-write` underlines the whole of `@F1@`, and the
  browser default drops a decoration wherever a glyph crosses it, which the tail
  of `@` does — so the mark has been drawn with two gaps in it since it was
  written.

## 1.1.0 - 2026-08-07

- Cap the hover tooltip at `min(40rem, 90vw)` by `min(20rem, 60vh)` and let it
  scroll. A tooltip sizes itself to its content, and a diagnostic carries text
  whose length the editor does not control, so a long one covered the document.
- Build decorations for the viewport rather than for the whole document, and
  rebuild them once the typing stops instead of on every keystroke.
- Keep the fold gutter off the input path, and settle "has the document changed"
  by identity rather than by reading the text out of the editor.
- Give diagnostics and decorations a single settle delay, so the two land at one
  moment and whichever runs first pays for the reparse.
- Requires `@domorium/language-service` 1.1.0 or newer: highlighting reads the
  token offsets that release adds.

## 1.0.0 - 2026-08-05

- First stable release. The exported extension factories, commands, and position
  helpers are now the package's committed public API: a breaking change to them
  requires a major version.
- No behavioral change from 0.2.0.

## 0.2.0 - 2026-08-03

- Move the package from `@gedcom/codemirror` to `@domorium/codemirror` as part
  of the Domorium rebrand.
- Replace the language service dependency with `@domorium/language-service`.

## 0.1.0 - 2026-07-30

- Initial public release.
- Integrate GEDCOM completion, diagnostics, quick fixes, hover, folding,
  semantic highlighting, indentation hints, document links, definitions, and
  references with CodeMirror 6.
- Provide safe, atomic workspace edits and XREF rename commands.
- Keep CodeMirror and host-specific behavior outside the package bundle.
