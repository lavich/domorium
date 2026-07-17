import { describe, expect, it } from "vitest";
import { GedcomDocument } from "../document/gedcomDocument";

const document = (text: string) => new GedcomDocument().createDocument(text);

describe("GedcomDocument.getCompletions", () => {
  it("offers GEDCOM 7 root tags when the version is not available", () => {
    const doc = document("");

    const labels = doc
      .getCompletions({ line: 0, character: 2 }, "0 ")
      .map((item) => item.label);

    expect(labels).toContain("HEAD");
    expect(labels).toContain("INDI");
    expect(labels).toContain("TRLR");
  });

  it("offers only tags valid under the current parent", () => {
    const doc = document(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 NAME Ada /Lovelace/
0 TRLR
`);

    const labels = doc
      .getCompletions({ line: 5, character: 2 }, "1 ")
      .map((item) => item.label);

    expect(labels).toContain("BIRT");
    expect(labels).toContain("SEX");
    expect(labels).not.toContain("HEAD");
  });

  it("suppresses a tag after its maximum cardinality is consumed", () => {
    const doc = document(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 SEX F
1 NAME Ada /Lovelace/
0 TRLR
`);

    const labels = doc
      .getCompletions({ line: 6, character: 2 }, "1 ")
      .map((item) => item.label);

    expect(labels).not.toContain("SEX");
  });

  it("does not count the line being edited as an extra sibling", () => {
    const doc = document(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 SEX F
0 TRLR
`);

    const labels = doc
      .getCompletions({ line: 4, character: 4 }, "1 SE")
      .map((item) => item.label);

    expect(labels).toContain("SEX");
  });

  it("uses the GEDCOM 5.5.1 schema when VERS begins with 5", () => {
    const doc = document(`0 HEAD
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME Ada /Lovelace/
0 TRLR
`);
    const labels = doc
      .getCompletions({ line: 5, character: 2 }, "1 ")
      .map((item) => item.label);
    expect(labels).toContain("RFN");
  });

  it("completes enum values", () => {
    const doc = document(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 SEX
0 TRLR
`);
    const items = doc.getCompletions({ line: 4, character: 6 }, "1 SEX ");
    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "M", kind: "enum" }),
        expect.objectContaining({ label: "F", kind: "enum" }),
      ]),
    );
  });

  it("completes only compatible pointers and GEDCOM 7 VOID", () => {
    const doc = document(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 NAME Ada /Lovelace/
0 @F1@ FAM
1 WIFE
0 TRLR
`);
    const labels = doc
      .getCompletions({ line: 7, character: 7 }, "1 WIFE ")
      .map((item) => item.label);
    expect(labels).toContain("@I1@");
    expect(labels).toContain("@VOID@");
    expect(labels).not.toContain("@F1@");
  });

  it("does not offer VOID in GEDCOM 5.5.1", () => {
    const doc = document(`0 HEAD
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
0 @F1@ FAM
1 WIFE
0 TRLR
`);
    const labels = doc
      .getCompletions({ line: 5, character: 7 }, "1 WIFE ")
      .map((item) => item.label);
    expect(labels).toContain("@I1@");
    expect(labels).not.toContain("@VOID@");
  });

  it("returns no items for unsupported and malformed contexts", () => {
    const doc = document("0 @I1@ INDI\n1 NAME Ada /Lovelace/\n");
    expect(doc.getCompletions({ line: 1, character: 7 }, "1 NAME ")).toEqual(
      [],
    );
    expect(doc.getCompletions({ line: 2, character: 4 }, "oops")).toEqual([]);
  });

  it("completes every value of a multiselect enum", () => {
    const doc = document(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 RESN
0 TRLR
`);
    const items = doc.getCompletions({ line: 4, character: 7 }, "1 RESN ");
    expect(items).toEqual(
      expect.arrayContaining([
        { label: "CONFIDENTIAL", kind: "enum" },
        { label: "LOCKED", kind: "enum" },
        { label: "PRIVACY", kind: "enum" },
      ]),
    );
  });
});
