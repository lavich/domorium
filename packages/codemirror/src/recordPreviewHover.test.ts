import { describe, expect, it } from "vitest";

import { previewTransition } from "./recordPreviewHover.js";
import type { RecordPreview } from "./recordPreview.js";

function preview(from: number): RecordPreview {
  return {
    from: 100,
    to: 140,
    truncated: false,
    pointer: { from, to: from + 4 },
  };
}

describe("deciding what a pointing device just asked for", () => {
  it("stays quiet while nothing is pointed at", () => {
    expect(previewTransition(null, null)).toEqual({
      action: "keep",
      shown: null,
    });
  });

  it("shows the record when a pointer is reached", () => {
    expect(previewTransition(null, preview(7))).toEqual({
      action: "show",
      shown: 7,
    });
  });

  it("does not show the same pointer twice, so the preview does not flicker", () => {
    expect(previewTransition(7, preview(7))).toEqual({
      action: "keep",
      shown: 7,
    });
  });

  it("shows the next record when the device moves to another pointer", () => {
    expect(previewTransition(7, preview(20))).toEqual({
      action: "show",
      shown: 20,
    });
  });

  it("hides the record when the device leaves the pointer", () => {
    expect(previewTransition(7, null)).toEqual({ action: "hide", shown: null });
  });

  it("does not hide what is already hidden", () => {
    expect(previewTransition(null, null).action).toBe("keep");
  });
});
