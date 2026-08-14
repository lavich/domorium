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
import {
  EditorState,
  type Range as CodeMirrorRange,
  StateEffect,
  type Extension,
} from "@codemirror/state";
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
  type DocumentLinkKind,
  type GedcomLanguageService,
  semanticTokenLegend,
  type WorkspaceEdit,
} from "@domorium/language-service";
import { tags, type Tag } from "@lezer/highlight";

import {
  offsetToPosition,
  pointerOnRange,
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
  return referenceHighlightSpecs(state, language.update(state.doc));
}

function referenceHighlightSpecs(
  state: EditorState,
  service: GedcomLanguageService,
): ReferenceHighlightSpec[] {
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
export const SETTLE_DELAY_MS = 250;

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
  return hoverTooltip((view, offset, side) => {
    const doc = view.state.doc;
    const hover = language.update(doc).getHover(offsetToPosition(doc, offset));
    if (!hover || !pointerOnRange(doc, offset, side, hover.range)) {
      return null;
    }
    return {
      pos: offset,
      create() {
        const dom = document.createElement("div");
        dom.textContent = hover.contents.value;
        return { dom };
      },
    };
  });
}

function foldingSource(language: EditorLanguageService): Extension {
  return foldService.of((state, lineStart) => {
    // Asked for every visible line on every view update, so it must neither
    // force a reparse nor walk the document. See EditorLanguageService.current.
    const service = language.current(state.doc);
    if (!service) {
      return null;
    }
    const line = state.doc.lineAt(lineStart);
    const range = service.getFoldingRangeAt(line.number - 1);
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
  language: EditorLanguageService,
  build: (view: EditorView, service: GedcomLanguageService) => DecorationSet,
  {
    onSelectionChange = false,
    onViewportChange = false,
  }: { onSelectionChange?: boolean; onViewportChange?: boolean } = {},
): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      private timer: ReturnType<typeof setTimeout> | undefined;

      constructor(view: EditorView) {
        this.decorations = build(view, language.update(view.state.doc));
      }

      update(update: ViewUpdate): void {
        const rebuild = update.transactions.some(
          (transaction) =>
            transaction.reconfigured ||
            transaction.effects.some((effect) => effect.is(rebuildDecorations)),
        );
        if (rebuild) {
          this.cancel();
          this.decorations = build(
            update.view,
            language.update(update.state.doc),
          );
          return;
        }
        if (update.docChanged) {
          this.decorations = this.decorations.map(update.changes);
          this.schedule(update.view);
          return;
        }
        if (
          (onSelectionChange && update.selectionSet) ||
          (onViewportChange && update.viewportChanged)
        ) {
          // Never force a reparse here. Scrolling and moving the cursor both
          // land in this branch, and in the pause after an edit the parse is
          // deliberately behind — forcing it would put the whole cost back on
          // an interaction. What is already painted stays until it catches up.
          const service = language.current(update.state.doc);
          if (service) {
            this.decorations = build(update.view, service);
          }
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

function documentLinks(language: EditorLanguageService): Extension {
  return deferredDecorations(
    language,
    (view, service) => buildLinkDecorations(view, service),
    { onViewportChange: true },
  );
}

export interface DocumentLinkSpec {
  from: number;
  to: number;
  kind: DocumentLinkKind;
}

export function getDocumentLinkSpecs(
  state: EditorState,
  language: EditorLanguageService,
): DocumentLinkSpec[] {
  return documentLinkSpecs(state, language.update(state.doc));
}

function documentLinkSpecs(
  state: EditorState,
  service: GedcomLanguageService,
): DocumentLinkSpec[] {
  return service.getDocumentLinks().flatMap((link) => {
    const { from, to } = rangeToOffsets(state.doc, link.range);
    // A decoration spanning nothing is an error rather than a no-op.
    return to > from ? [{ from, to, kind: link.kind }] : [];
  });
}

/**
 * A web address is `url` and a file is `link`, which is what a host already
 * says about the two in its highlight style: colour belongs there, beside
 * every other colour it states, rather than in a rule of its own.
 */
export function documentLinkTag(kind: DocumentLinkKind): Tag {
  return kind === "http" ? tags.url : tags.link;
}

function buildLinkDecorations(
  view: EditorView,
  service: GedcomLanguageService,
): DecorationSet {
  const { state } = view;
  return Decoration.set(
    documentLinkSpecs(state, service).map((link) => {
      const themeClass = highlightingFor(state, [documentLinkTag(link.kind)]);
      const classes = [`gedcom-link gedcom-link-${link.kind}`, themeClass]
        .filter((value): value is string => value !== null)
        .join(" ");
      return Decoration.mark({ class: classes }).range(link.from, link.to);
    }),
    true,
  );
}

function referenceHighlights(language: EditorLanguageService): Extension {
  return deferredDecorations(
    language,
    (view, service) => buildReferenceDecorations(view, service),
    { onSelectionChange: true },
  );
}

function buildReferenceDecorations(
  view: EditorView,
  service: GedcomLanguageService,
): DecorationSet {
  return Decoration.set(
    referenceHighlightSpecs(view.state, service).map((highlight) =>
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

/**
 * Only the visible ranges are asked for.
 *
 * CodeMirror renders the viewport and nothing else, so decorations outside it
 * are built and thrown away. On a 15.6 MB document that was 2.2 million
 * tokens and 800 000 indent hints to paint forty lines. `viewportChanged`
 * brings this back as the user scrolls.
 */
function semanticDecorations(
  view: EditorView,
  service: GedcomLanguageService,
  indentationHints: boolean,
): DecorationSet {
  const { state } = view;
  const decorations: CodeMirrorRange<Decoration>[] = [];

  for (const { from, to } of view.visibleRanges) {
    for (const token of service.getSemanticTokens({ from, to })) {
      // Offsets, not a line and character: CodeMirror addresses everything by
      // offset, and so does the syntax tree the tokens come from.
      const tag = semanticTokenTag(token.tokenType);
      const classes = [
        tokenClass(token.tokenType),
        tag ? highlightingFor(state, [tag]) : null,
        token.tokenModifiers === 0 ? null : "gedcom-token-declaration",
      ].filter((value): value is string => value !== null);
      const end = Math.min(token.startOffset + token.length, state.doc.length);
      if (classes.length > 0 && token.startOffset < end) {
        decorations.push(
          Decoration.mark({ class: classes.join(" ") }).range(
            token.startOffset,
            end,
          ),
        );
      }
    }

    if (indentationHints) {
      for (const hint of service.getInlayHints({ from, to })) {
        decorations.push(
          Decoration.widget({
            widget: new IndentHintWidget(hint.label),
            side: -1,
          }).range(positionToOffset(state.doc, hint.position)),
        );
      }
    }
  }

  return Decoration.set(decorations, true);
}

/**
 * A name a stylesheet can reach, beside the class a `HighlightStyle` mints.
 * A host that states its colours in CSS needs one that does not change
 * between builds, and it is the name the legend gives.
 */
export function tokenClass(tokenType: number): string | null {
  const name = semanticTokenLegend.tokenTypes[tokenType];
  return name === undefined ? null : `gedcom-token-${name}`;
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
  return deferredDecorations(
    language,
    (view, service) => semanticDecorations(view, service, indentationHints),
    { onViewportChange: true },
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
    documentLinks(language),
    referenceHighlights(language),
    semanticFeatures(language, indentationHints),
    gedcomBaseTheme,
  ];
  if (diagnostics) {
    extensions.push(diagnosticSource(language, options.actions));
  }
  return extensions;
}

export interface StandaloneEditorOptions {
  /** Off leaves the lint gutter out, for a host that hides diagnostics. */
  diagnostics?: boolean;
}

export function createStandaloneEditorExtensions(
  options: StandaloneEditorOptions = {},
): Extension[] {
  return [
    lineNumbers(),
    history(),
    foldGutter(),
    ...((options.diagnostics ?? true) ? [lintGutter()] : []),
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
  ".cm-tooltip-hover": {
    maxWidth: "min(40rem, 90vw)",
    maxHeight: "min(20rem, 60vh)",
    overflow: "auto",
    overflowWrap: "anywhere",
  },
  ".gedcom-reference-read": {
    backgroundColor: "color-mix(in srgb, currentColor 12%, transparent)",
  },
  ".gedcom-reference-write": {
    backgroundColor: "color-mix(in srgb, currentColor 18%, transparent)",
    textDecoration: "underline",
    textDecorationSkipInk: "none",
  },
  ".gedcom-indent-hint": {
    opacity: "0.55",
    pointerEvents: "none",
  },
});
