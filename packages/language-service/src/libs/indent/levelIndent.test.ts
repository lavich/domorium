import { GedcomDocument } from "@domorium/validator";
import { describe, expect, it } from "vitest";

import { levelIndent } from "./levelIndent";

const document = new GedcomDocument();
document.createDocument(
  ["0 @I1@ INDI", "1 NAME Ada /Lovelace/", "2 GIVN Ada", "0 @I2@ INDI", "1 SEX F"].join(
    "\n",
  ),
);

describe("levelIndent", () => {
  it("indents every nested line by its level", () => {
    expect(levelIndent(document.getNodes())).toEqual([
      { position: { line: 2, character: 0 }, label: "    ", paddingRight: true },
      { position: { line: 1, character: 0 }, label: "  ", paddingRight: true },
      { position: { line: 4, character: 0 }, label: "  ", paddingRight: true },
    ]);
  });

  // The same reason as semantic tokens: a hint per nested line, for two
  // hundred thousand records, to indent the forty on screen. Measured at 197
  // ms on a 15.6 MB document, plus the adapter's own conversion.
  it("reaches only the records overlapping the requested range", () => {
    const nodes = document.getNodes();
    const second = nodes[1];

    const hints = levelIndent(nodes, {
      from: second.startOffset,
      to: second.endOffset,
    });

    expect(hints).toEqual([
      { position: { line: 4, character: 0 }, label: "  ", paddingRight: true },
    ]);
  });
});
