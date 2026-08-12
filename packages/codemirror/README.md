# @domorium/codemirror

[![npm](https://img.shields.io/npm/v/@domorium/codemirror)](https://www.npmjs.com/package/@domorium/codemirror)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/lavich/domorium/blob/main/LICENSE)

CodeMirror 6 integration for GEDCOM completion, diagnostics, hover, folding,
semantic highlighting, document links, definitions, references, rename, and
record preview. The language behavior comes from `@domorium/language-service`.

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

`recordPreviewHover` installs the gesture that previews the record a
cross-reference names, and marks the pointer under the reader's attention. The
host supplies `show` and `hide`, because what a preview is drawn on — a
tooltip, a popover — is the host's to decide; `getRecordPreviewRuns` turns the
record into runs carrying the host's own highlight classes.

`trigger` decides what opens one and defaults to the platform modifier;
`clearRecordPreview(view)` closes one from anywhere, and `hide` is called for it.

`createStandaloneEditorExtensions` is an optional preset for a complete
standalone editor; its lint gutter follows the `diagnostics` option. Embedded
hosts such as IDEs and note-taking applications usually provide their own editor
shell and should use only the extensions they need, composing their own theme
and highlight style on top of the preset rather than restating it.

The package does not depend on a browser worker, the Language Server Protocol,
or any particular editor host. CodeMirror packages are peer dependencies so the
host and GEDCOM integration share one CodeMirror runtime.
