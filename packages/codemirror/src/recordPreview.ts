import { highlightingFor } from "@codemirror/language";
import type { EditorState, Text } from "@codemirror/state";

import { semanticTokenTag } from "./extensions.js";
import { offsetToPosition, positionToOffset } from "./positions.js";
import type { EditorLanguageService } from "./service.js";

export interface OffsetSpan {
  from: number;
  to: number;
}

export interface RecordPreview extends OffsetSpan {
  truncated: boolean;
  pointer: OffsetSpan;
}

export interface PreviewToken {
  startOffset: number;
  endOffset: number;
  tokenType: number;
}

export interface PreviewRun {
  text: string;
  tokenType: number | null;
  className: string | null;
}

export function findRecordPreview(
  state: EditorState,
  language: EditorLanguageService,
  offset: number,
  maxLines: number,
): RecordPreview | null {
  const doc = state.doc;
  const service = language.update(doc);
  const position = offsetToPosition(doc, offset);
  const [definition] = service.getDefinitionRanges(position);
  if (!definition || definition.start.line === position.line) {
    return null;
  }
  const pointer = findPointer(language, doc, offset);
  if (!pointer) {
    return null;
  }
  const startLine = definition.start.line;
  const endLine = service.getFoldingRangeAt(startLine)?.endLine ?? startLine;
  const lastShown = Math.min(endLine, startLine + maxLines - 1);
  return {
    from: doc.line(startLine + 1).from,
    to: doc.line(lastShown + 1).to,
    truncated: endLine > lastShown,
    pointer,
  };
}

export function getRecordPreviewRuns(
  state: EditorState,
  language: EditorLanguageService,
  preview: RecordPreview,
): PreviewRun[] {
  const tokens = language.update(state.doc).getSemanticTokens(preview);
  return toPreviewRuns(state.doc, preview.from, preview.to, tokens).map(
    (run) => ({ ...run, className: classNameFor(state, run.tokenType) }),
  );
}

export function toPreviewRuns(
  doc: Text,
  from: number,
  to: number,
  tokens: PreviewToken[],
): PreviewRun[] {
  const runs: PreviewRun[] = [];
  let cursor = from;
  const push = (start: number, end: number, tokenType: number | null) => {
    runs.push({
      text: doc.sliceString(start, end),
      tokenType,
      className: null,
    });
  };
  for (const token of tokens) {
    const start = Math.max(token.startOffset, from);
    const end = Math.min(token.endOffset, to);
    if (end <= start || start < cursor) {
      continue;
    }
    if (start > cursor) {
      push(cursor, start, null);
    }
    push(start, end, token.tokenType);
    cursor = end;
  }
  if (cursor < to) {
    push(cursor, to, null);
  }
  return runs;
}

function findPointer(
  language: EditorLanguageService,
  doc: Text,
  offset: number,
): OffsetSpan | null {
  const highlights = language
    .update(doc)
    .getDocumentHighlights(offsetToPosition(doc, offset));
  for (const highlight of highlights) {
    const from = positionToOffset(doc, highlight.range.start);
    const to = positionToOffset(doc, highlight.range.end);
    if (from <= offset && offset <= to) {
      return { from, to };
    }
  }
  return null;
}

function classNameFor(
  state: EditorState,
  tokenType: number | null,
): string | null {
  if (tokenType === null) {
    return null;
  }
  const tag = semanticTokenTag(tokenType);
  return tag === null ? null : highlightingFor(state, [tag]);
}
