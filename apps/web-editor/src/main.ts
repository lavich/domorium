import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
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
        webSyntaxHighlighting,
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
    backgroundColor: "#1e1e1e",
    fontSize: "14px",
  },
  ".cm-scroller": {
    overflow: "auto",
    fontFamily: "Menlo, Monaco, Consolas, monospace",
  },
  ".cm-content": { caretColor: "#ffffff" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#ffffff" },
  ".cm-gutters": {
    color: "#858585",
    backgroundColor: "#1e1e1e",
    border: "none",
  },
  ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "#2a2d2e" },
  // ".gedcom-reference-read": { backgroundColor: "#264f78" },
  // ".gedcom-reference-write": {
  //   backgroundColor: "#264f78",
  //   textDecoration: "underline",
  // },
  // ".gedcom-token-comment": { color: "#6a9955" },
  // ".gedcom-token-keyword": { color: "#569cd6" },
  // ".gedcom-token-string": { color: "#ce9178" },
  // ".gedcom-token-declaration": { fontWeight: "600" },
  // ".gedcom-indent-hint": {
  //   color: "#6a9955",
  //   opacity: "0.7",
  //   paddingRight: "0.4em",
  // },
}, { dark: true });

const webSyntaxHighlighting = syntaxHighlighting(HighlightStyle.define([
  { tag: tags.comment, color: "#6a9955" },
  { tag: tags.keyword, color: "#569cd6" },
  { tag: tags.string, color: "#ce9178" },
]));

init().catch(console.error);
