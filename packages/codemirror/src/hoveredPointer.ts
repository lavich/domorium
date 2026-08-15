import { StateEffect, StateField, type EditorState } from "@codemirror/state";

import type { OffsetSpan } from "./recordPreview.js";

export const setHoveredPointer = StateEffect.define<OffsetSpan | null>();

export function hoveredPointer(state: EditorState): OffsetSpan | null {
  return state.field(hoveredPointerField);
}

/** Which pointer a preview is open for, and nothing about how it looks. */
export const hoveredPointerField = StateField.define<OffsetSpan | null>({
  create: () => null,
  update(span, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setHoveredPointer)) {
        return effect.value;
      }
    }
    if (!span || !transaction.docChanged) {
      return span;
    }
    // An edit above the pointer moves it; the preview is still its preview.
    return {
      from: transaction.changes.mapPos(span.from),
      to: transaction.changes.mapPos(span.to),
    };
  },
});
