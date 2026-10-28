import { describe, expect, it } from "vitest";

import { relativeFilePath, resolveFileTarget } from "./fileTargetPath";

describe("resolveFileTarget", () => {
  it("resolves a path from the folder the document sits in", () => {
    expect(
      resolveFileTarget("family/tree.ged", "photos/marie.jpg", "7.0"),
    ).toBe("family/photos/marie.jpg");
  });

  it("decodes a GEDCOM 7 escape, so my%20photo.jpg is not looked for by that name", () => {
    expect(resolveFileTarget("tree.ged", "photos/my%20photo.jpg", "7.0")).toBe(
      "photos/my photo.jpg",
    );
  });

  it("drops a dot segment in GEDCOM 7, as moveFileLinks does", () => {
    expect(resolveFileTarget("tree.ged", "./photo.jpg", "7.0")).toBe(
      "photo.jpg",
    );
  });

  it("keeps a segment with a malformed escape as written, as decodeFileTarget does", () => {
    expect(resolveFileTarget("tree.ged", "a%20b%zz.jpg", "7.0")).toBe(
      "a%20b%zz.jpg",
    );
  });

  it("refuses an escape that decodes to a separator, a parent, a dot or a drive's colon", () => {
    for (const target of [
      "a%2Fb.jpg",
      "a%5Cb.jpg",
      "%2E%2E/x.jpg",
      "%2e%2e/x.jpg",
      "%2E/x.jpg",
      "C%3A/photo.jpg",
    ]) {
      expect(
        resolveFileTarget("family/tree.ged", target, "7.0"),
        target,
      ).toBeNull();
    }
  });

  it("leaves a 5.5.1 escape as written, so %2F is a name and not a separator", () => {
    expect(resolveFileTarget("tree.ged", "a%2Fb.jpg", "5.5.1")).toBe(
      "a%2Fb.jpg",
    );
  });

  it("separates at a 5.5.1 backslash, which an exported file may carry", () => {
    expect(
      resolveFileTarget("family/tree.ged", "..\\shared\\photo.jpg", "5.5.1"),
    ).toBe("shared/photo.jpg");
  });

  it("refuses what documentLinks does not read as a relative link", () => {
    expect(resolveFileTarget("tree.ged", "a\\b.jpg", "7.0")).toBeNull();
    expect(
      resolveFileTarget("family/tree.ged", "../photo.jpg", "7.0"),
    ).toBeNull();
    expect(resolveFileTarget("tree.ged", "/photos/a.jpg", "5.5.1")).toBeNull();
    expect(
      resolveFileTarget("tree.ged", "C:\\photos\\a.jpg", "5.5.1"),
    ).toBeNull();
    expect(resolveFileTarget("tree.ged", "photo.jpg", undefined)).toBeNull();
  });

  it("climbs in 5.5.1, and refuses to climb above the root", () => {
    expect(resolveFileTarget("a/b/tree.ged", "../../photo.jpg", "5.5.1")).toBe(
      "photo.jpg",
    );
    expect(
      resolveFileTarget("family/tree.ged", "../../photo.jpg", "5.5.1"),
    ).toBeNull();
    expect(
      resolveFileTarget("family/tree.ged", "../shared/photo.jpg", "5.5.1"),
    ).toBe("shared/photo.jpg");
  });

  it("refuses a payload naming a folder, which no host opens as a file", () => {
    for (const target of ["./", "a/..", ".", "photos/", "photos/."]) {
      expect(
        resolveFileTarget("family/tree.ged", target, "5.5.1"),
        target,
      ).toBeNull();
    }
    expect(resolveFileTarget("family/tree.ged", "photos/", "7.0")).toBeNull();
  });
});

describe("relativeFilePath", () => {
  it("spells a path from the folder the document sits in", () => {
    expect(relativeFilePath("family/tree.ged", "family/media/photo.jpg")).toBe(
      "media/photo.jpg",
    );
    expect(relativeFilePath("family/tree.ged", "family/photo.jpg")).toBe(
      "photo.jpg",
    );
    expect(relativeFilePath("tree.ged", "media/photo.jpg")).toBe(
      "media/photo.jpg",
    );
    expect(relativeFilePath("family/tree.ged", "shared/photo.jpg")).toBe(
      "../shared/photo.jpg",
    );
    expect(relativeFilePath("a/b/tree.ged", "photo.jpg")).toBe(
      "../../photo.jpg",
    );
  });

  it("spells a path that 5.5.1 resolves back to the same file", () => {
    for (const [document, path] of [
      ["family/tree.ged", "shared/photo.jpg"],
      ["a/b/tree.ged", "a/c/photo.jpg"],
    ]) {
      expect(
        resolveFileTarget(document, relativeFilePath(document, path), "5.5.1"),
      ).toBe(path);
    }
  });
});
