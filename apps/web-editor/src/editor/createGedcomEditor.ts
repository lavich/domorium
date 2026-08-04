import { keymap } from "@codemirror/view";
import {
  defaultHighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import { oneDark } from "@codemirror/theme-one-dark";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  applyWorkspaceEdit,
  createGedcomExtensions,
  createStandaloneEditorExtensions,
  type DocumentLink,
  EditorLanguageService,
  goToDefinition,
  goToNextReference,
  offsetToPosition,
  rangeToOffsets,
  renameReference,
} from "@domorium/codemirror";

import type { GedcomEditorHandle, WebDiagnostic, WebTheme } from "./types";

export interface CreateGedcomEditorOptions {
  parent: HTMLElement;
  initialText: string;
  theme: WebTheme;
  onChange(text: string): void;
  onDiagnosticsChange(diagnostics: WebDiagnostic[]): void;
}

export function createGedcomEditor(
  options: CreateGedcomEditorOptions,
): GedcomEditorHandle {
  const theme = new Compartment();
  const language = new EditorLanguageService();
  let editor: EditorView | null = null;

  const updateHost = (view: EditorView): void => {
    const text = view.state.sliceDoc();
    const service = language.update(text);
    options.onDiagnosticsChange(
      service.getDiagnostics().map((diagnostic) => {
        const offsets = rangeToOffsets(view.state.doc, diagnostic.range);
        return {
          severity: diagnostic.severity,
          message: diagnostic.message,
          from: offsets.from,
          to: offsets.to,
          line: diagnostic.range.start.line,
          character: diagnostic.range.start.character,
        };
      }),
    );
  };

  const state = EditorState.create({
    doc: options.initialText,
    extensions: [
      ...createGedcomExtensions({
        language,
        actions: {
          applyWorkspaceEdit: (edit) =>
            editor
              ? applyWorkspaceEdit(editor, edit, language.getVersion())
              : false,
          openDocumentLink,
        },
      }),
      ...createStandaloneEditorExtensions(),
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
          run: (view) => renameAtSelection(view, language),
        },
      ]),
      EditorView.updateListener.of((update) => {
        if (!update.docChanged) {
          return;
        }
        options.onChange(update.state.sliceDoc());
        updateHost(update.view);
      }),
      theme.of(editorTheme(options.theme)),
      webEditorLayout,
    ],
  });

  editor = new EditorView({ parent: options.parent, state });
  updateHost(editor);

  return {
    destroy: () => {
      editor?.destroy();
      editor = null;
    },
    focusDiagnostic: (diagnostic) => {
      editor?.dispatch({
        selection: { anchor: diagnostic.from, head: diagnostic.to },
        scrollIntoView: true,
      });
      editor?.focus();
    },
    setTheme: (value) => {
      editor?.dispatch({
        effects: theme.reconfigure(editorTheme(value)),
      });
    },
  };
}

function editorTheme(theme: WebTheme) {
  return theme === "dark" ? oneDark : syntaxHighlighting(defaultHighlightStyle);
}

function renameAtSelection(
  view: EditorView,
  language: EditorLanguageService,
): boolean {
  const prepared = language
    .update(view.state.sliceDoc())
    .prepareRename(
      offsetToPosition(view.state.doc, view.state.selection.main.head),
    );
  if (!prepared.ok) {
    return false;
  }
  const nextName = window.prompt("Rename GEDCOM XREF", prepared.placeholder);
  return nextName === null ? true : renameReference(view, language, nextName);
}

function openDocumentLink(link: DocumentLink): void {
  if (link.kind === "http") {
    window.open(link.targetText, "_blank", "noopener,noreferrer");
  }
}

const webEditorLayout = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "14px",
  },
  ".cm-scroller": {
    overflow: "auto",
    fontFamily: "Menlo, Monaco, Consolas, monospace",
  },
});
