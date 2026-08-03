import { Text } from "@codemirror/state";
import { describe, expect, it } from "vitest";

import {
  offsetToPosition,
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
