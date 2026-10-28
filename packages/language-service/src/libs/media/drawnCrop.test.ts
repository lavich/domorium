import { describe, expect, it } from "vitest";

import { drawnCrop } from "./drawnCrop";

describe("drawnCrop", () => {
  it("keeps a rectangle the image holds", () => {
    expect(
      drawnCrop({ top: 100, left: 250, height: 400, width: 300 }, 1000, 800),
    ).toEqual({ top: 100, left: 250, height: 400, width: 300 });
  });

  it("is clamped to the part of it the image reaches", () => {
    expect(
      drawnCrop({ top: 100, left: 900, height: 400, width: 300 }, 1000, 300),
    ).toEqual({ top: 100, left: 900, height: 200, width: 100 });
    expect(
      drawnCrop({ top: 80, left: 90, width: 50, height: 50 }, 100, 100),
    ).toEqual({ top: 80, left: 90, width: 10, height: 20 });
  });

  it("starts at the image's edge, not a negative extent, for a rectangle that starts before it", () => {
    expect(
      drawnCrop({ top: -10, left: -20, width: 50, height: 50 }, 100, 100),
    ).toEqual({ top: 0, left: 0, width: 30, height: 40 });
  });

  it("gives up where the image does not reach it at all", () => {
    expect(
      drawnCrop({ top: 0, left: 2000, height: 100, width: 100 }, 1000, 800),
    ).toBeNull();
    expect(
      drawnCrop({ top: 200, left: 0, width: 10, height: 10 }, 100, 100),
    ).toBeNull();
  });

  it("gives up on a rectangle with no extent", () => {
    expect(
      drawnCrop({ top: 0, left: 0, height: 0, width: 300 }, 1000, 800),
    ).toBeNull();
    expect(
      drawnCrop({ top: 0, left: 0, height: 300, width: 0 }, 1000, 800),
    ).toBeNull();
  });

  it("gives up on a size that is not a number, rather than draw a NaN rectangle", () => {
    expect(
      drawnCrop({ top: 0, left: 0, height: 10, width: 10 }, NaN, 100),
    ).toBeNull();
    expect(
      drawnCrop({ top: 0, left: 0, height: NaN, width: 10 }, 100, 100),
    ).toBeNull();
  });

  it("gives up before the image has a size to measure against", () => {
    expect(
      drawnCrop({ top: 0, left: 0, height: 10, width: 10 }, 0, 100),
    ).toBeNull();
  });
});
