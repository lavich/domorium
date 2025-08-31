import { describe, expect, test } from "vitest";
import { GedcomDocument } from "./gedcomDocument";

describe("validator", () => {
  test("minimal valid test", async () => {
    const gedcomDocument = new GedcomDocument();
    gedcomDocument.createDocument(`0 HEAD
1 GEDC
2 VERS 7.0
0 TRLR
`);
    const nodes = gedcomDocument.getNodes();
    expect(nodes.length).toBe(2);
    expect(gedcomDocument.pointers.size).toBe(0);
    expect(gedcomDocument.xRefs.size).toBe(0);
  });

  test("minimal valid test pointers", async () => {
    const gedcomDocument = new GedcomDocument();
    gedcomDocument.createDocument(`0 HEAD
1 GEDC
2 VERS 7.0
0 @indi1@ INDI
0 @fam1@ FAM
1 WIFE @indi1@
0 TRLR
`);
    const nodes = gedcomDocument.getNodes();
    expect(nodes.length).toBe(4);
    expect(gedcomDocument.pointers.size).toBe(2);
    expect(gedcomDocument.xRefs.size).toBe(1);
  });
});
