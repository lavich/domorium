import { describe, expect, it } from "vitest";
import { nearestXref } from "./nearestXref";

describe("nearest xref", () => {
  it("corrects a dropped character", () => {
    expect(nearestXref("@F1450@", ["@F145@", "@F209@"])).toBe("@F145@");
  });

  it("corrects a transposition, which costs two edits", () => {
    expect(nearestXref("@F145@", ["@F154@", "@F900@"])).toBe("@F154@");
  });

  it("corrects a doubled character", () => {
    expect(nearestXref("@I112@", ["@I12@", "@I77@"])).toBe("@I12@");
  });

  // Issue #249: clicking a replacement attaches a person to that family, the
  // document then validates clean, and nothing points at the mistake again. A
  // near tie is exactly where the tool cannot know which was meant.
  it("offers nothing when two candidates are equally near", () => {
    expect(nearestXref("@F1450@", ["@F145@", "@F1451@"])).toBeUndefined();
  });

  it("offers the nearest when a second candidate is near but farther", () => {
    expect(nearestXref("@F1450@", ["@F145@", "@F1455X@"])).toBe("@F145@");
  });

  it("offers nothing when the nearest is more than two edits away", () => {
    expect(nearestXref("@F1450@", ["@F209@", "@F77@"])).toBeUndefined();
  });

  it("offers nothing from an empty document", () => {
    expect(nearestXref("@F1450@", [])).toBeUndefined();
  });

  // Replacing an xref with itself fixes nothing, so the pool containing it is
  // not a reason to offer an edit.
  it("does not offer the xref itself", () => {
    expect(nearestXref("@F145@", ["@F145@"])).toBeUndefined();
  });

  it("makes no assumption about the shape of an xref", () => {
    expect(
      nearestXref("@6f1a2b3c-0000-4000-8000-000000000001@", [
        "@6f1a2b3c-0000-4000-8000-000000000010@",
        "@9999ffff-0000-4000-8000-000000000001@",
      ]),
    ).toBe("@6f1a2b3c-0000-4000-8000-000000000010@");
  });
});
