import { describe, expect, it } from "vitest";

import { classifyGedcomLine } from "./language";
import * as languageModule from "./language";

describe("GEDCOM syntax classification", () => {
  it("does not bundle a fixed syntax palette", () => {
    expect("gedcomSyntaxHighlighting" in languageModule).toBe(false);
  });

  it("classifies a record declaration", () => {
    expect(classifyGedcomLine("0 @I1@ INDI")).toEqual([
      { from: 0, to: 1, role: "level" },
      { from: 2, to: 6, role: "xrefDeclaration" },
      { from: 7, to: 11, role: "tag" },
    ]);
  });

  it("classifies a pointer and a free-text value", () => {
    expect(classifyGedcomLine("1 FAMC @F1@")).toEqual([
      { from: 0, to: 1, role: "level" },
      { from: 2, to: 6, role: "tag" },
      { from: 7, to: 11, role: "xref" },
    ]);
    expect(classifyGedcomLine("1 NAME Homer /Simpson/")).toEqual([
      { from: 0, to: 1, role: "level" },
      { from: 2, to: 6, role: "tag" },
      { from: 7, to: 22, role: "value" },
    ]);
  });

  it("does not misclassify malformed content", () => {
    expect(classifyGedcomLine("not a GEDCOM line")).toEqual([]);
  });
});
