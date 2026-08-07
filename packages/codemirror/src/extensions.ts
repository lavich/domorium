import {
  autocompletion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  foldGutter,
  foldService,
  highlightingFor,
  indentUnit,
} from "@codemirror/language";
import {
  linter,
  lintGutter,
  type Diagnostic as CodeMirrorDiagnostic,
} from "@codemirror/lint";
import { EditorState, StateEffect, type Extension } from "@codemirror/state";
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
} from "@domorium/language-service";
import { tags, type Tag } from "@lezer/highlight";

import {
  offsetToPosition,
  positionToOffset,
  rangeToOffsets,
} from "./positions.js";
import { EditorLanguageService } from "./service.js";

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
  const service = language.update(state.doc);
  return service
    .getDocumentHighlights(
      offsetToPosition(state.doc, state.selection.main.head),
    )
    .map((highlight) => ({
      ...rangeToOffsets(state.doc, highlight.range),
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
  return actions
    .flatMap((action) => [
      ...(action.edit ? [{ name: action.title, edit: action.edit }] : []),
      ...(action.choices ?? []).map((choice) => ({
        name: choice.title,
        edit: choice.edit,
      })),
    ])
    .map(({ name, edit }) => ({
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

/**
 * How long after the last edit the editor catches up with the document.
 * Shared so that diagnostics and decorations settle at one moment rather than
 * two, and so whichever runs first pays for the reparse and the other reuses
 * it.
 */
const SETTLE_DELAY_MS = 250;

const completionType: Record<number, string> = {
  5: "property",
  18: "variable",
  20: "enum",
};

function completionSource(
  language: EditorLanguageService,
  context: CompletionContext,
): CompletionResult | null {
  const before = context.matchBefore(/[A-Z0-9_@]*$/i);
  const line = context.state.doc.lineAt(context.pos);
  const prefix = line.text.slice(0, context.pos - line.from);
  if (
    !context.explicit &&
    (!before || before.from === before.to) &&
    !prefix.endsWith(" ")
  ) {
    return null;
  }
  const items = language
    .update(context.state.doc)
    .getCompletionItems(offsetToPosition(context.state.doc, context.pos));
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
  return linter(
    (view) =>
      language
        .update(view.state.doc)
        .getDiagnostics()
        .map((diagnostic): CodeMirrorDiagnostic => {
          const range = rangeToOffsets(view.state.doc, diagnostic.range);
          return {
            from: range.from,
            to: Math.max(range.from, range.to),
            severity:
              diagnostic.severity === "error"
                ? "error"
                : diagnostic.severity === "warning"
                  ? "warning"
                  : "info",
            message: diagnostic.message,
            source: "GEDCOM",
            actions: getDiagnosticActions(
              language,
              diagnostic,
              actions.applyWorkspaceEdit,
            ),
          };
        }),
    { delay: SETTLE_DELAY_MS },
  );
}

function hoverSource(language: EditorLanguageService): Extension {
  return hoverTooltip((view, offset) => {
    const hover = language
      .update(view.state.doc)
      .getHover(offsetToPosition(view.state.doc, offset));
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
    const range = language
      .update(state.doc)
      .getFoldingRanges()
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
      const service = language.update(view.state.doc);
      const definition = service.getDefinitionRanges(
        offsetToPosition(view.state.doc, offset),
      )[0];
      if (!definition) {
        return false;
      }
      event.preventDefault();
      view.dispatch({
        selection: {
          anchor: positionToOffset(view.state.doc, definition.start),
        },
        scrollIntoView: true,
      });
      view.focus();
      return true;
    },
    click(event, view) {
      if (
        !(event.metaKey || event.ctrlKey) ||
        event.button !== 0 ||
        !actions.openDocumentLink
      ) {
        return false;
      }
      const offset = view.posAtCoords({ x: event.clientX, y: event.clientY });
      if (offset === null) {
        return false;
      }
      const link = language
        .update(view.state.doc)
        .getDocumentLinks()
        .find((candidate) => {
          const range = rangeToOffsets(view.state.doc, candidate.range);
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

const rebuildDecorations = StateEffect.define<null>();

/**
 * A decoration plugin that rebuilds off the input path.
 *
 * Building either of this file's decoration sets starts with
 * `language.update`, which reparses and revalidates the whole document — 447
 * ms of a keystroke's 590 ms on a 3.1 MB file. Doing that inside `update()`
 * is what made typing lag, and both plugins did it.
 *
 * On an edit the existing set is mapped through the change instead, which
 * costs the size of the edit rather than the size of the document, and the
 * rebuild is scheduled. Text already on screen keeps its decorations and
 * moves with the edit; text just typed has none until the pause. The linter
 * has made the same trade since it was added.
 */
function deferredDecorations(
  build: (view: EditorView) => DecorationSet,
  { onSelectionChange = false }: { onSelectionChange?: boolean } = {},
): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      private timer: ReturnType<typeof setTimeout> | undefined;

      constructor(view: EditorView) {
        this.decorations = build(view);
      }

      update(update: ViewUpdate): void {
        const rebuild = update.transactions.some(
          (transaction) =>
            transaction.reconfigured ||
            transaction.effects.some((effect) => effect.is(rebuildDecorations)),
        );
        if (rebuild) {
          this.cancel();
          this.decorations = build(update.view);
          return;
        }
        if (update.docChanged) {
          this.decorations = this.decorations.map(update.changes);
          this.schedule(update.view);
          return;
        }
        // The document has not changed, so the service answers from its
        // existing parse and this costs a lookup.
        if (onSelectionChange && update.selectionSet) {
          this.decorations = build(update.view);
        }
      }

      destroy(): void {
        this.cancel();
      }

      private schedule(view: EditorView): void {
        this.cancel();
        this.timer = setTimeout(() => {
          this.timer = undefined;
          view.dispatch({ effects: rebuildDecorations.of(null) });
        }, SETTLE_DELAY_MS);
      }

      private cancel(): void {
        if (this.timer !== undefined) {
          clearTimeout(this.timer);
          this.timer = undefined;
        }
      }
    },
    { decorations: (plugin) => plugin.decorations },
  );
}

function referenceHighlights(language: EditorLanguageService): Extension {
  return deferredDecorations(
    (view) => buildReferenceDecorations(view, language),
    { onSelectionChange: true },
  );
}

function buildReferenceDecorations(
  view: EditorView,
  language: EditorLanguageService,
): DecorationSet {
  return Decoration.set(
    getReferenceHighlightSpecs(view.state, language).map((highlight) =>
      Decoration.mark({
        class: `gedcom-reference-${highlight.kind}`,
      }).range(highlight.from, highlight.to),
    ),
  );
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
  const service = language.update(state.doc);
  const tokens = service
    .getSemanticTokens()
    .flatMap((token) => {
      const from = positionToOffset(state.doc, {
        line: token.line,
        character: token.char,
      });
      const tag = semanticTokenTag(token.tokenType);
      const themeClass = tag ? highlightingFor(state, [tag]) : null;
      const classes = [
        themeClass,
        token.tokenModifiers === 0 ? null : "gedcom-token-declaration",
      ].filter((value): value is string => value !== null);
      return classes.length === 0
        ? []
        : [
            Decoration.mark({ class: classes.join(" ") }).range(
              from,
              Math.min(from + token.length, state.doc.length),
            ),
          ];
    })
    .filter(({ from, to }) => from < to);
  const hints = indentationHints
    ? service.getInlayHints().map((hint) =>
        Decoration.widget({
          widget: new IndentHintWidget(hint.label),
          side: -1,
        }).range(positionToOffset(state.doc, hint.position)),
      )
    : [];
  return Decoration.set(
    [...tokens, ...hints].sort(
      (left, right) => left.from - right.from || left.to - right.to,
    ),
    true,
  );
}

export function semanticTokenTag(tokenType: number): Tag | null {
  switch (semanticTokenLegend.tokenTypes[tokenType]) {
    case "comment":
      return tags.comment;
    case "keyword":
      return tags.keyword;
    case "string":
      return tags.string;
    default:
      return null;
  }
}

function semanticFeatures(
  language: EditorLanguageService,
  indentationHints: boolean,
): Extension {
  return deferredDecorations((view) =>
    semanticDecorations(view.state, language, indentationHints),
  );
}

export function createGedcomExtensions(
  options: GedcomEditorOptions,
): Extension[] {
  const language = options.language ?? new EditorLanguageService();
  const diagnostics = options.settings?.diagnostics ?? true;
  const indentationHints = options.settings?.indentationHints ?? true;
  const extensions: Extension[] = [
    autocompletion({
      override: [(context) => completionSource(language, context)],
    }),
    hoverSource(language),
    foldingSource(language),
    navigation(language, options.actions),
    referenceHighlights(language),
    semanticFeatures(language, indentationHints),
    gedcomBaseTheme,
  ];
  if (diagnostics) {
    extensions.push(diagnosticSource(language, options.actions));
  }
  return extensions;
}

export function createStandaloneEditorExtensions(): Extension[] {
  return [
    lineNumbers(),
    history(),
    foldGutter(),
    lintGutter(),
    indentUnit.of("  "),
    EditorView.lineWrapping,
    EditorView.contentAttributes.of({
      spellcheck: "false",
      autocorrect: "off",
    }),
    keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
  ];
}

const gedcomBaseTheme = EditorView.baseTheme({
  ".gedcom-reference-read": {
    backgroundColor: "color-mix(in srgb, currentColor 12%, transparent)",
  },
  ".gedcom-reference-write": {
    backgroundColor: "color-mix(in srgb, currentColor 18%, transparent)",
    textDecoration: "underline",
  },
  ".gedcom-indent-hint": {
    opacity: "0.55",
    pointerEvents: "none",
  },
});
