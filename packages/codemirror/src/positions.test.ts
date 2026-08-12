import { Text } from "@codemirror/state";
import { describe, expect, it } from "vitest";

import {
  offsetToPosition,
  pointerOnRange,
  positionToOffset,
  rangeToOffsets,
} from "./positions";

describe("CodeMirror position conversion", () => {
  const document = Text.of(["0 HEAD", "1 GEDC", "2 VERS 5.5.1"]);

  it("converts between language-service positions and offsets", () => {
    expect(positionToOffset(document, { line: 1, character: 2 })).toBe(9);
    expect(offsetToPosition(document, 9)).toEqual({ line: 1, character: 2 });
  });

  it("clamps positions and ranges to the document", () => {
    expect(
      rangeToOffsets(document, {
        start: { line: 2, character: 2 },
        end: { line: 2, character: 6 },
      }),
    ).toEqual({ from: 16, to: 20 });
    expect(positionToOffset(document, { line: 99, character: 99 })).toBe(
      document.length,
    );
  });
});

describe("what a pointing device is over", () => {
  const doc = Text.of(["1 FAMS @F0002@"]);
  const tag = {
    start: { line: 0, character: 2 },
    end: { line: 0, character: 6 },
  };

  it("reads the character before the boundary when the pointer is left of it", () => {
    expect(pointerOnRange(doc, 6, -1, tag)).toBe(true);
  });

  it("reads the character after it, which is the space and not the tag", () => {
    expect(pointerOnRange(doc, 6, 1, tag)).toBe(false);
  });

  it("covers the first character of the range from either side", () => {
    expect(pointerOnRange(doc, 2, 1, tag)).toBe(true);
    expect(pointerOnRange(doc, 3, -1, tag)).toBe(true);
  });

  it("stops before the range, where the space belongs to nobody", () => {
    expect(pointerOnRange(doc, 2, -1, tag)).toBe(false);
  });
});
