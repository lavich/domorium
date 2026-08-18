import { highlightingFor } from "@codemirror/language";
import type { EditorState, Text } from "@codemirror/state";

import { semanticTokenTag } from "./extensions.js";
import { offsetToPosition, rangeToOffsets } from "./positions.js";
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
  const preview = language
    .update(doc)
    .getRecordPreview(offsetToPosition(doc, offset), { maxLines });
  if (!preview) {
    return null;
  }
  return {
    ...rangeToOffsets(doc, preview.range),
    truncated: preview.truncated,
    pointer: rangeToOffsets(doc, preview.pointer),
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
