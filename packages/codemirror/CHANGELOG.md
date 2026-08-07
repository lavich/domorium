# Changelog

All notable changes to `@domorium/codemirror` are documented here.

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
