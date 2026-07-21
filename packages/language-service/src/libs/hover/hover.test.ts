import { describe, expect, it } from "vitest";
import { getHover } from "./hover";
import { GedcomDocument } from "@domorium/validator";

const gedcomDocument = new GedcomDocument();
gedcomDocument.createDocument(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 BIRT
2 DATE 1 APR 1911
0 TRLR
`);

describe("getHover", () => {
  it("shows the tag label when hovering over a TAG", () => {
    // line 4 is "1 BIRT" — cursor inside "BIRT"
    const hover = getHover(gedcomDocument, gedcomDocument.getNodes(), {
      line: 4,
      character: 3,
    });

    expect(hover).toStrictEqual({
      contents: { kind: "markdown", value: "**BIRT** — Birth" },
      range: { start: { line: 4, character: 2 }, end: { line: 4, character: 6 } },
    });
  });

  it("returns null when not hovering over a TAG", () => {
    const hover = getHover(gedcomDocument, gedcomDocument.getNodes(), {
      line: 4,
      character: 0,
    });

    expect(hover).toBeNull();
  });
});
