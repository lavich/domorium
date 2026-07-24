import { describe, expect, it } from "vitest";
import { findDefinitionRanges } from "./definition";
import { GedcomDocument } from "gedcom-validator";
import { ReferenceIndex } from "../references/referenceIndex";

const gedcomDocument = new GedcomDocument();
gedcomDocument.createDocument(`0 @Homer_Simpson@ INDI
0 @F0000@ FAM
1 HUSB @Homer_Simpson@
1 WIFE @Marge_Simpson@
`);
const referenceIndex = new ReferenceIndex(
  gedcomDocument.getNodes(),
  (node) => gedcomDocument.getPointerTargetTag(node),
);

describe("findDefinitionRanges", () => {
  it("resolves the XREF under the cursor to its record definition", () => {
    // "1 HUSB @Homer_Simpson@" — line 2, cursor inside "@Homer_Simpson@"
    const ranges = findDefinitionRanges(
      referenceIndex,
      { line: 2, character: 10 },
    );

    expect(ranges).toStrictEqual([
      { start: { line: 0, character: 2 }, end: { line: 0, character: 17 } },
    ]);
  });

  it("returns nothing when the pointer has no matching record", () => {
    const ranges = findDefinitionRanges(
      referenceIndex,
      { line: 3, character: 10 },
    );

    expect(ranges).toStrictEqual([]);
  });

  it("returns nothing when the cursor is not on an XREF", () => {
    const ranges = findDefinitionRanges(
      referenceIndex,
      { line: 2, character: 1 },
    );

    expect(ranges).toStrictEqual([]);
  });
});
