import {
  autocompletion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { foldGutter, foldService, indentUnit } from "@codemirror/language";
import { linter, lintGutter, type Diagnostic as CodeMirrorDiagnostic } from "@codemirror/lint";
import { EditorState, type Extension } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  hoverTooltip,
  keymap,
  lineNumbers,
  type DecorationSet,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import {
  type CompletionItem,
  type Diagnostic,
  type DocumentLink,
  semanticTokenLegend,
  type WorkspaceEdit,
} from "@gedcom/language-service";

import { gedcomLanguage, gedcomSyntaxHighlighting } from "./language";
import { toOffset, toOffsets, toPosition } from "./positions";
import { EditorLanguageService } from "./service";

export interface GedcomEditorSettings {
  diagnostics?: boolean;
  indentationHints?: boolean;
}

export interface GedcomEditorActions {
  applyWorkspaceEdit(edit: WorkspaceEdit): boolean;
  openDocumentLink?(link: DocumentLink): void;
}

export interface GedcomEditorOptions {
  language?: EditorLanguageService;
  settings?: GedcomEditorSettings;
  actions: GedcomEditorActions;
}

export interface ReferenceHighlightSpec {
  from: number;
  to: number;
  kind: "read" | "write";
}

export function getReferenceHighlightSpecs(
  state: EditorState,
  language: EditorLanguageService,
): ReferenceHighlightSpec[] {
  const service = language.update(state.sliceDoc());
  return service.getDocumentHighlights(
    toPosition(state.doc, state.selection.main.head),
  ).map((highlight) => ({
    ...toOffsets(state.doc, highlight.range),
    kind: highlight.kind,
  }));
}

export function getDiagnosticActions(
  language: EditorLanguageService,
  diagnostic: Diagnostic,
  applyEdit: (edit: WorkspaceEdit) => boolean,
): { name: string; apply(): void }[] {
  const actions = language.service.getCodeActions(
    diagnostic.range,
    [diagnostic],
    language.getVersion(),
  );
  if (!Array.isArray(actions)) {
    return [];
  }
  return actions.flatMap((action) => [
    ...(action.edit ? [{ name: action.title, edit: action.edit }] : []),
    ...(action.choices ?? []).map((choice) => ({
      name: choice.title,
      edit: choice.edit,
    })),
  ]).map(({ name, edit }) => ({
    name,
    apply: () => {
      try {
        applyEdit(edit);
      } catch {
        // Host integrations must not be able to break CodeMirror's lint UI.
      }
    },
  }));
}

const completionType: Record<number, string> = {
  5: "property",
  17: "variable",
  18: "enum",
};

function completionSource(
  language: EditorLanguageService,
  context: CompletionContext,
): CompletionResult | null {
  const before = context.matchBefore(/[A-Z0-9_@]*$/i);
  const line = context.state.doc.lineAt(context.pos);
  const prefix = line.text.slice(0, context.pos - line.from);
  if (!context.explicit && (!before || before.from === before.to) &&
      !prefix.endsWith(" ")) {
    return null;
  }
  const items = language.update(context.state.sliceDoc())
    .getCompletionItems(toPosition(context.state.doc, context.pos));
  if (items.length === 0) {
    return null;
  }
  return {
    from: before?.from ?? context.pos,
    options: items.map((item: CompletionItem) => ({
      label: item.label,
      detail: item.detail,
      type: item.kind ? completionType[item.kind] : undefined,
    })),
  };
}

function diagnosticSource(
  language: EditorLanguageService,
  actions: GedcomEditorActions,
): Extension {
  return linter((view) => language.update(view.state.sliceDoc())
    .getDiagnostics().map((diagnostic): CodeMirrorDiagnostic => {
      const range = toOffsets(view.state.doc, diagnostic.range);
      return {
        from: range.from,
        to: Math.max(range.from, range.to),
        severity: diagnostic.severity === "error"
          ? "error"
          : diagnostic.severity === "warning" ? "warning" : "info",
        message: diagnostic.message,
        source: "GEDCOM",
        actions: getDiagnosticActions(
          language,
          diagnostic,
          actions.applyWorkspaceEdit,
        ),
      };
    }), { delay: 250 });
}

function hoverSource(language: EditorLanguageService): Extension {
  return hoverTooltip((view, offset) => {
    const hover = language.update(view.state.sliceDoc())
      .getHover(toPosition(view.state.doc, offset));
    if (!hover) {
      return null;
    }
    return {
      pos: offset,
      create() {
        const dom = document.createElement("div");
        dom.className = "gedcom-hover";
        dom.textContent = hover.contents.value;
        return { dom };
      },
    };
  });
}

function foldingSource(language: EditorLanguageService): Extension {
  return foldService.of((state, lineStart) => {
    const line = state.doc.lineAt(lineStart);
    const range = language.update(state.sliceDoc()).getFoldingRanges()
      .find((candidate) => candidate.startLine === line.number - 1);
    if (!range) {
      return null;
    }
    return {
      from: line.to,
      to: state.doc.line(Math.min(range.endLine + 1, state.doc.lines)).to,
    };
  });
}

function navigation(
  language: EditorLanguageService,
  actions: GedcomEditorActions,
): Extension {
  return EditorView.domEventHandlers({
    mousedown(event, view) {
      if (!(event.metaKey || event.ctrlKey) || event.button !== 0) {
        return false;
      }
      const offset = view.posAtCoords({ x: event.clientX, y: event.clientY });
      if (offset === null) {
        return false;
      }
      const service = language.update(view.state.sliceDoc());
      const definition = service.getDefinitionRanges(
        toPosition(view.state.doc, offset),
      )[0];
      if (!definition) {
        return false;
      }
      event.preventDefault();
      view.dispatch({
        selection: { anchor: toOffset(view.state.doc, definition.start) },
        scrollIntoView: true,
      });
      view.focus();
      return true;
    },
    click(event, view) {
      if (!(event.metaKey || event.ctrlKey) || event.button !== 0 ||
          !actions.openDocumentLink) {
        return false;
      }
      const offset = view.posAtCoords({ x: event.clientX, y: event.clientY });
      if (offset === null) {
        return false;
      }
      const link = language.update(view.state.sliceDoc()).getDocumentLinks()
        .find((candidate) => {
          const range = toOffsets(view.state.doc, candidate.range);
          return offset >= range.from && offset < range.to;
        });
      if (!link) {
        return false;
      }
      event.preventDefault();
      try {
        actions.openDocumentLink(link);
      } catch {
        return false;
      }
      return true;
    },
  });
}

function referenceHighlights(language: EditorLanguageService): Extension {
  return ViewPlugin.fromClass(class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildReferenceDecorations(view, language);
    }

    update(update: ViewUpdate): void {
      if (update.docChanged || update.selectionSet) {
        this.decorations = buildReferenceDecorations(update.view, language);
      }
    }
  }, { decorations: (plugin) => plugin.decorations });
}

function buildReferenceDecorations(
  view: EditorView,
  language: EditorLanguageService,
): DecorationSet {
  return Decoration.set(getReferenceHighlightSpecs(view.state, language)
    .map((highlight) => Decoration.mark({
      class: `gedcom-reference-${highlight.kind}`,
    }).range(highlight.from, highlight.to)));
}

class IndentHintWidget extends WidgetType {
  constructor(private readonly label: string) {
    super();
  }

  toDOM(): HTMLElement {
    const dom = document.createElement("span");
    dom.className = "gedcom-indent-hint";
    dom.textContent = this.label;
    return dom;
  }

  eq(other: IndentHintWidget): boolean {
    return other.label === this.label;
  }
}

function semanticDecorations(
  state: EditorState,
  language: EditorLanguageService,
  indentationHints: boolean,
): DecorationSet {
  const service = language.update(state.sliceDoc());
  const tokens = service.getSemanticTokens().map((token) => {
    const from = toOffset(state.doc, { line: token.line, character: token.char });
    const type = semanticTokenLegend.tokenTypes[token.tokenType] ?? "unknown";
    const declaration = token.tokenModifiers === 0 ? "" : " gedcom-token-declaration";
    return Decoration.mark({ class: `gedcom-token-${type}${declaration}` })
      .range(from, Math.min(from + token.length, state.doc.length));
  }).filter(({ from, to }) => from < to);
  const hints = indentationHints ? service.getInlayHints().map((hint) =>
    Decoration.widget({
      widget: new IndentHintWidget(hint.label),
      side: -1,
    }).range(toOffset(state.doc, hint.position))) : [];
  return Decoration.set(
    [...tokens, ...hints].sort((left, right) => left.from - right.from || left.to - right.to),
    true,
  );
}

function semanticFeatures(
  language: EditorLanguageService,
  indentationHints: boolean,
): Extension {
  return ViewPlugin.fromClass(class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = semanticDecorations(view.state, language, indentationHints);
    }

    update(update: ViewUpdate): void {
      if (update.docChanged) {
        this.decorations = semanticDecorations(
          update.state,
          language,
          indentationHints,
        );
      }
    }
  }, { decorations: (plugin) => plugin.decorations });
}

export function createGedcomExtensions(options: GedcomEditorOptions): Extension[] {
  const language = options.language ?? new EditorLanguageService();
  const diagnostics = options.settings?.diagnostics ?? true;
  const indentationHints = options.settings?.indentationHints ?? true;
  const extensions: Extension[] = [
    gedcomLanguage,
    gedcomSyntaxHighlighting,
    lineNumbers(),
    history(),
    foldGutter(),
    autocompletion({ override: [(context) => completionSource(language, context)] }),
    hoverSource(language),
    foldingSource(language),
    navigation(language, options.actions),
    referenceHighlights(language),
    semanticFeatures(language, indentationHints),
    indentUnit.of("  "),
    EditorView.lineWrapping,
    EditorView.contentAttributes.of({ spellcheck: "false", autocorrect: "off" }),
    keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
  ];
  if (diagnostics) {
    extensions.push(lintGutter(), diagnosticSource(language, options.actions));
  }
  return extensions;
}
