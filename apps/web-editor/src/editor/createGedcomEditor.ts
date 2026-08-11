import { keymap } from "@codemirror/view";
import {
  highlightSelectionMatches,
  openSearchPanel,
  search,
  searchKeymap,
} from "@codemirror/search";
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
  recordPreviewHover,
  renameReference,
  SETTLE_DELAY_MS,
} from "@domorium/codemirror";

import { recordPreviewTooltip, setRecordPreview } from "./recordPreviewTooltip";
import type {
  GedcomEditorHandle,
  WebDiagnostic,
  WebEditorStatus,
  WebTheme,
} from "./types";

export interface CreateGedcomEditorOptions {
  parent: HTMLElement;
  initialText: string;
  theme: WebTheme;
  /** An edit happened. Deliberately carries no text — see GedcomEditorHandle.getText. */
  onChange(): void;
  onDiagnosticsChange(diagnostics: WebDiagnostic[]): void;
  onStatusChange(status: WebEditorStatus): void;
}

export function createGedcomEditor(
  options: CreateGedcomEditorOptions,
): GedcomEditorHandle {
  const theme = new Compartment();
  const language = new EditorLanguageService();
  let editor: EditorView | null = null;

  /**
   * Refreshing the problems panel reparses and revalidates the whole
   * document, which is the most expensive thing the editor does. Running it
   * from the update listener put that back on every keystroke and undid the
   * scheduling the editor's own plugins do, so it waits for the same pause
   * they wait for.
   */
  let settle: ReturnType<typeof setTimeout> | undefined;
  const scheduleHostUpdate = (view: EditorView): void => {
    if (settle !== undefined) {
      clearTimeout(settle);
    }
    settle = setTimeout(() => {
      settle = undefined;
      updateHost(view);
    }, SETTLE_DELAY_MS);
  };

  const updateHost = (view: EditorView): void => {
    // The document, not a string: an unchanged one then costs nothing.
    const service = language.update(view.state.doc);
    options.onDiagnosticsChange(
      service.getDiagnostics().map((diagnostic) => {
        const offsets = rangeToOffsets(view.state.doc, diagnostic.range);
        return {
          severity: diagnostic.severity,
          code: String(diagnostic.code),
          message: diagnostic.message,
          from: offsets.from,
          to: offsets.to,
          line: diagnostic.range.start.line,
          character: diagnostic.range.start.character,
        };
      }),
    );
    reportStatus(view, service.getVersionResolution());
  };

  /**
   * Not behind the settle delay, because the caret moves far more often than
   * the document does; the resolution it reports is the last one parsed.
   */
  let lastResolution: WebEditorStatus["resolution"];
  const reportStatus = (
    view: EditorView,
    resolution: WebEditorStatus["resolution"] = lastResolution,
  ): void => {
    lastResolution = resolution;
    const head = view.state.selection.main.head;
    const position = offsetToPosition(view.state.doc, head);
    options.onStatusChange({
      line: position.line,
      character: position.character,
      resolution,
    });
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
      recordPreviewTooltip(language),
      recordPreviewHover({
        language,
        show: (preview, view) =>
          view.dispatch({ effects: setRecordPreview.of(preview) }),
        hide: (view) => view.dispatch({ effects: setRecordPreview.of(null) }),
      }),
      search({ top: true }),
      highlightSelectionMatches(),
      keymap.of(searchKeymap),
      EditorView.updateListener.of((update) => {
        if (update.selectionSet && !update.docChanged) {
          reportStatus(update.view);
        }
        if (!update.docChanged) {
          return;
        }
        options.onChange();
        scheduleHostUpdate(update.view);
      }),
      theme.of(editorTheme(options.theme)),
      webEditorLayout,
    ],
  });

  editor = new EditorView({ parent: options.parent, state });
  updateHost(editor);

  return {
    getText: () => editor?.state.sliceDoc() ?? options.initialText,
    destroy: () => {
      if (settle !== undefined) {
        clearTimeout(settle);
        settle = undefined;
      }
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
    openSearch: () => {
      if (editor) {
        openSearchPanel(editor);
        editor.focus();
      }
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
