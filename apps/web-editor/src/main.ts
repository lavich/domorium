import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import {
  applyWorkspaceEdit,
  createGedcomExtensions,
  type DocumentLink,
  EditorLanguageService,
  goToDefinition,
  goToNextReference,
  renameReference,
  toPosition,
} from "@gedcom/codemirror";

async function init(): Promise<void> {
  const document = await loadSample();
  const language = new EditorLanguageService();
  const editorRef: { current: EditorView | null } = { current: null };
  const editor = new EditorView({
    parent: documentRoot(),
    state: EditorState.create({
      doc: document,
      extensions: [
        ...createGedcomExtensions({
          language,
          actions: {
            applyWorkspaceEdit: (edit) => {
              return editorRef.current
                ? applyWorkspaceEdit(editorRef.current, edit, language.getVersion())
                : false;
            },
            openDocumentLink,
          },
        }),
        keymap.of([
          {
            key: "F12",
            run: (view) => goToDefinition(view, language),
          },
          {
            key: "Shift-F12",
            run: (view) => goToNextReference(view, language) > 0,
          },
          {
            key: "F2",
            run: (view) => {
              const prepared = language.update(view.state.sliceDoc())
                .prepareRename(toPosition(
                  view.state.doc,
                  view.state.selection.main.head,
                ));
              if (!prepared.ok) {
                return false;
              }
              const nextName = window.prompt(
                "Rename GEDCOM XREF",
                prepared.placeholder,
              );
              return nextName === null
                ? true
                : renameReference(view, language, nextName);
            },
          },
        ]),
        webEditorTheme,
      ],
    }),
  });
  editorRef.current = editor;
}

async function loadSample(): Promise<string> {
  const response = await fetch(`${import.meta.env.BASE_URL}simpsons55.ged`);
  if (!response.ok) {
    throw new Error(`Failed to load simpsons55.ged: ${response.status}`);
  }
  return response.text();
}

function documentRoot(): HTMLElement {
  const root = document.getElementById("codemirror-editor-root");
  if (!root) {
    throw new Error("CodeMirror editor root was not found");
  }
  return root;
}

function openDocumentLink(link: DocumentLink): void {
  if (link.kind === "http") {
    window.open(link.targetText, "_blank", "noopener,noreferrer");
  }
}

const webEditorTheme = EditorView.theme({
  "&": {
    height: "100%",
    color: "#d4d4d4",
    fontSize: "14px",
  },
  ".cm-scroller": {
    overflow: "auto",
    fontFamily: "Menlo, Monaco, Consolas, monospace",
  },
  ".cm-gutters": {
    color: "#858585",
    border: "none",
  },
  ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "#2a2d2e" },
});

init().catch(console.error);
