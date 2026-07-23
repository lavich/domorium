import { describe, expect, it } from "vitest";
import { GedcomLanguageService } from "../../languageService";

const service = new GedcomLanguageService(
  [
    "0 @I1@ INDI",
    "1 NAME Homer /Simpson/",
    "0 @F1@ FAM",
    "1 HUSB @I1@",
    "1 CHIL @I2@",
  ].join("\n"),
);

const declarationRange = {
  start: { line: 0, character: 2 },
  end: { line: 0, character: 6 },
};
const usageRange = {
  start: { line: 3, character: 7 },
  end: { line: 3, character: 11 },
};

describe("XREF navigation", () => {
  it("returns usages and optionally includes the declaration", () => {
    expect(
      service.getReferences(
        { line: 3, character: 9 },
        { includeDeclaration: false },
      ),
    ).toEqual([usageRange]);
    expect(
      service.getReferences(
        { line: 3, character: 9 },
        { includeDeclaration: true },
      ),
    ).toEqual([declarationRange, usageRange]);
  });

  it("highlights declarations as writes and usages as reads", () => {
    expect(
      service.getDocumentHighlights({ line: 0, character: 4 }),
    ).toEqual([
      { range: declarationRange, kind: "write" },
      { range: usageRange, kind: "read" },
    ]);
  });

  it("returns an unresolved usage without inventing a declaration", () => {
    expect(
      service.getReferences(
        { line: 4, character: 9 },
        { includeDeclaration: true },
      ),
    ).toEqual([
      {
        start: { line: 4, character: 7 },
        end: { line: 4, character: 11 },
      },
    ]);
  });

  it("returns no navigation results outside an XREF token", () => {
    expect(
      service.getReferences(
        { line: 1, character: 8 },
        { includeDeclaration: true },
      ),
    ).toEqual([]);
    expect(service.getDocumentHighlights({ line: 1, character: 8 })).toEqual(
      [],
    );
  });

  it("treats token ranges as half-open", () => {
    expect(
      service.getReferences(
        { line: 3, character: 11 },
        { includeDeclaration: true },
      ),
    ).toEqual([]);
  });
});
