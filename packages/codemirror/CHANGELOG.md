# Changelog

All notable changes to `@domorium/codemirror` are documented here.

## 1.4.0 - 2026-08-14

- **A web address and a file path are marked as links.** Both had been openable
  with Ctrl/Cmd-click since they were added, and neither looked like anything: a
  reader had no way to tell there was something to click. They now carry
  `gedcom-link` and `gedcom-link-<kind>` — `http`, `file-relative`,
  `file-absolute` — underlined by the base theme, which is the one cue the
  syntax highlighting does not already use. A host that colours them should do
  it under the pointer rather than always: level, pointer and tag hold every
  colour a reader has learnt to read, and a fourth competes with them.
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
