# @gedcom/codemirror

CodeMirror 6 integration for GEDCOM completion, diagnostics, hover, folding,
semantic highlighting, document links, definitions, references, and rename.
The language behavior comes from `@gedcom/language-service`.

## Install

Install the package and the CodeMirror peer dependencies used by your host:

```bash
npm install @gedcom/codemirror \
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
} from "@gedcom/codemirror";

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

The package does not depend on a browser worker, the Language Server Protocol,
or any particular editor host. CodeMirror packages are peer dependencies so the
host and GEDCOM integration share one CodeMirror runtime.
