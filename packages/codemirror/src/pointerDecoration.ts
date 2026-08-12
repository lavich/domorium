import { StateEffect, StateField, type EditorState } from "@codemirror/state";
import { Decoration, EditorView, type DecorationSet } from "@codemirror/view";

import type { OffsetSpan } from "./recordPreview.js";

export const setHoveredPointer = StateEffect.define<OffsetSpan | null>();

/** The pointer a preview is open on, for a host that needs to know. */
export function hoveredPointer(state: EditorState): OffsetSpan | null {
  let span: OffsetSpan | null = null;
  state.field(hoveredPointerField).between(0, state.doc.length, (from, to) => {
    span = { from, to };
    return false;
  });
  return span;
}

const pointerMark = Decoration.mark({ class: "gedcom-hovered-pointer" });

export const hoveredPointerField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decorations, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setHoveredPointer)) {
        return effect.value === null
          ? Decoration.none
          : Decoration.set([
              pointerMark.range(effect.value.from, effect.value.to),
            ]);
      }
    }
    return decorations.map(transaction.changes);
  },
  provide: (field) => EditorView.decorations.from(field),
});
