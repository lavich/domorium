import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";

import { hoveredPointerField, setHoveredPointer } from "./pointerDecoration.js";

function marked(state: EditorState) {
  const found: { from: number; to: number }[] = [];
  state.field(hoveredPointerField).between(0, state.doc.length, (from, to) => {
    found.push({ from, to });
  });
  return found;
}

function create(doc: string) {
  return EditorState.create({ doc, extensions: [hoveredPointerField] });
}

describe("hovered pointer decoration", () => {
  it("marks nothing until a pointer is hovered", () => {
    expect(marked(create("0 @I1@ INDI"))).toEqual([]);
  });

  it("marks the hovered pointer", () => {
    const state = create("1 FAMS @F1@").update({
      effects: setHoveredPointer.of({ from: 7, to: 11 }),
    }).state;

    expect(marked(state)).toEqual([{ from: 7, to: 11 }]);
  });

  it("clears the mark when the pointer is left", () => {
    let state = create("1 FAMS @F1@").update({
      effects: setHoveredPointer.of({ from: 7, to: 11 }),
    }).state;
    state = state.update({ effects: setHoveredPointer.of(null) }).state;

    expect(marked(state)).toEqual([]);
  });

  it("follows the pointer through an edit rather than marking stale text", () => {
    let state = create("1 FAMS @F1@").update({
      effects: setHoveredPointer.of({ from: 7, to: 11 }),
    }).state;
    state = state.update({ changes: { from: 0, insert: "0 HEAD\n" } }).state;

    expect(marked(state)).toEqual([{ from: 14, to: 18 }]);
  });
});
