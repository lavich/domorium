import { StateEffect, StateField } from "@codemirror/state";
import { Decoration, EditorView, type DecorationSet } from "@codemirror/view";

import type { OffsetSpan } from "./recordPreview.js";

export const setHoveredPointer = StateEffect.define<OffsetSpan | null>();

const hoveredPointer = Decoration.mark({ class: "gedcom-hovered-pointer" });

export const hoveredPointerField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decorations, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setHoveredPointer)) {
        return effect.value === null
          ? Decoration.none
          : Decoration.set([
              hoveredPointer.range(effect.value.from, effect.value.to),
            ]);
      }
    }
    return decorations.map(transaction.changes);
  },
  provide: (field) => EditorView.decorations.from(field),
});
