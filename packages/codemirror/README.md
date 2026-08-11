# @domorium/codemirror

[![npm](https://img.shields.io/npm/v/@domorium/codemirror)](https://www.npmjs.com/package/@domorium/codemirror)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/lavich/domorium/blob/main/LICENSE)

CodeMirror 6 integration for GEDCOM completion, diagnostics, hover, folding,
semantic highlighting, document links, definitions, references, and rename.
The language behavior comes from `@domorium/language-service`.

Part of [Domorium](https://github.com/lavich/domorium) — GEDCOM editor tooling for
the browser, Obsidian, VS Code, and JetBrains IDEs.

## Install

Install the package and the CodeMirror peer dependencies used by your host:

```bash
npm install @domorium/codemirror \
  @codemirror/autocomplete \
  @codemirror/commands \
  @codemirror/language \
  @codemirror/lint \
  @codemirror/state \
  @codemirror/view \
  @lezer/highlight
```

## Usage

```typescript
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  applyWorkspaceEdit,
  createGedcomExtensions,
  createStandaloneEditorExtensions,
  EditorLanguageService,
} from "@domorium/codemirror";

const language = new EditorLanguageService();
let view: EditorView;

const state = EditorState.create({
  doc: "0 HEAD\n0 TRLR\n",
  extensions: [
    ...createStandaloneEditorExtensions(),
    ...createGedcomExtensions({
      language,
      settings: {
        diagnostics: true,
        indentationHints: true,
      },
      actions: {
        applyWorkspaceEdit: (edit) =>
          applyWorkspaceEdit(view, edit, language.getVersion()),
        openDocumentLink: (link) => {
          console.log(link);
        },
      },
    }),
  ],
});

view = new EditorView({ state, parent: document.body });
```

`createGedcomExtensions` contains GEDCOM-specific features and accepts host
callbacks for workspace edits and document links. It does not install general
editor keymaps, gutters, history, or layout behavior.

`createStandaloneEditorExtensions` is an optional preset for a complete
standalone editor. Embedded hosts such as IDEs and note-taking applications
usually provide their own editor shell and should use only the extensions they
need.

## Record preview

A cross-reference tells the reader nothing on its own: `1 FAMS @F1@` is only
meaningful once you know what `@F1@` is. `findRecordPreview` resolves the
pointer at an offset and returns the span of the record it names, together with
the span of the pointer itself; `getRecordPreviewRuns` splits that span into
runs carrying the host's own highlight classes, so a preview looks like the
editor it came from.

```typescript
import {
  findRecordPreview,
  getRecordPreviewRuns,
  hoveredPointerField,
  setHoveredPointer,
} from "@domorium/codemirror";

// hoveredPointerField goes among the editor's extensions.
const offset = view.posAtCoords({ x: event.clientX, y: event.clientY });
const preview =
  offset === null ? null : findRecordPreview(view.state, language, offset, 24);

if (preview) {
  view.dispatch({ effects: setHoveredPointer.of(preview.pointer) });
  for (const run of getRecordPreviewRuns(view.state, language, preview)) {
    const span = container.appendChild(document.createElement("span"));
    span.textContent = run.text;
    if (run.className) {
      span.className = run.className;
    }
  }
}
```

The host owns what surrounds this: which gesture opens a preview, what it is
drawn in, and when it closes. `setHoveredPointer.of(null)` clears the mark.

The marked pointer carries the class `gedcom-hovered-pointer` and is unstyled
until the host says what it looks like. Give it
`text-decoration-skip-ink: none` if you underline it — the tail of `@` crosses
the line, and the browser default drops the underline under both delimiters.

`preview.truncated` reports that the record was longer than `maxLines` and the
span stops short of its end.

The package does not depend on a browser worker, the Language Server Protocol,
or any particular editor host. CodeMirror packages are peer dependencies so the
host and GEDCOM integration share one CodeMirror runtime.
