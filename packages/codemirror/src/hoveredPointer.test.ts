import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";

import {
  hoveredPointer,
  setHoveredPointer,
  hoveredPointerField,
} from "./hoveredPointer.js";

function create(doc: string) {
  return EditorState.create({ doc, extensions: [hoveredPointerField] });
}

describe("which pointer a preview is open for", () => {
  it("is none until one is hovered", () => {
    expect(hoveredPointer(create("0 @I1@ INDI"))).toBeNull();
  });

  it("is the hovered pointer", () => {
    const state = create("1 FAMS @F1@").update({
      effects: setHoveredPointer.of({ from: 7, to: 11 }),
    }).state;

    expect(hoveredPointer(state)).toEqual({ from: 7, to: 11 });
  });

  it("is none again when the pointer is left", () => {
    let state = create("1 FAMS @F1@").update({
      effects: setHoveredPointer.of({ from: 7, to: 11 }),
    }).state;
    state = state.update({ effects: setHoveredPointer.of(null) }).state;

    expect(hoveredPointer(state)).toBeNull();
  });

  it("follows the pointer through an edit rather than naming stale text", () => {
    let state = create("1 FAMS @F1@").update({
      effects: setHoveredPointer.of({ from: 7, to: 11 }),
    }).state;
    state = state.update({ changes: { from: 0, insert: "0 HEAD\n" } }).state;

    expect(hoveredPointer(state)).toEqual({ from: 14, to: 18 });
  });
});
