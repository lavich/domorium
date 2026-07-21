import { describe, expect, it } from "vitest";
import { levelFolding } from "./levelFolding";
import { GedcomDocument } from "@domorium/validator";

const gedcomDocument = new GedcomDocument();
gedcomDocument.createDocument(`0 @Abraham_Simpson@ INDI
1 NAME Abraham /Simpson/
2 GIVN Abraham
2 SURN Simpson
1 SEX M
1 FAMS @F0002@
1 CHAN
2 DATE 11 FEB 2007
3 TIME 15:05:36`);

describe("levelFolding", () => {
  it("parse SAMPLE", () => {
    const res = levelFolding(gedcomDocument.getNodes());

    expect(res).toStrictEqual([
      { startLine: 0, endLine: 8 },
      { startLine: 1, endLine: 3 },
      { startLine: 6, endLine: 8 },
      { startLine: 7, endLine: 8 },
    ]);
  });
});
