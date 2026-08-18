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

  // The same sets that validate 5.5.1 values are offered while one is typed, and
  // 5.5.1 writes them in lower case where GEDCOM 7 writes them in upper.
  it("completes every value of a 5.5.1 enum", () => {
    const doc = document(`0 HEAD
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 FAMC @F1@
2 PEDI
0 @F1@ FAM
0 TRLR
`);
    expect(doc.getCompletions({ line: 5, character: 7 }, "2 PEDI ")).toEqual([
      { label: "adopted", kind: "enum" },
      { label: "birth", kind: "enum" },
      { label: "foster", kind: "enum" },
      { label: "sealing", kind: "enum" },
    ]);
    expect(doc.getCompletions({ line: 4, character: 7 }, "1 RESN ")).toEqual(
      expect.arrayContaining([{ label: "privacy", kind: "enum" }]),
    );
  });

  it("does not reuse a parent from a branch closed by a lower-level node", () => {
    const doc = document(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 BIRT
0 TRLR
`);

    expect(doc.getCompletions({ line: 6, character: 2 }, "2 ")).toEqual([]);
  });

  it("returns no items when a parent chain has a missing tag", () => {
    const doc = document(`0 @I1@ INDI
1 SEX
`);
    const parent = doc.getNodes()[0];
    parent.tokens.TAG = undefined;

    expect(() =>
      doc.getCompletions({ line: 1, character: 6 }, "1 SEX "),
    ).not.toThrow();
    expect(doc.getCompletions({ line: 1, character: 6 }, "1 SEX ")).toEqual([]);
  });

  it("does not reuse an earlier sibling when the cached line level conflicts", () => {
    const doc = document(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 BIRT
2 DATE 1 JAN 1900
1 DEAT
0 TRLR
`);

    expect(doc.getCompletions({ line: 6, character: 2 }, "2 ")).toEqual([]);
  });

  it("offers extension tags declared in SCHMA", () => {
    const doc = document(`0 HEAD
1 GEDC
2 VERS 7.0
1 SCHMA
2 TAG _SKYPEID http://xmlns.com/foaf/0.1/skypeID
0 @U1@ SUBM
1 NAME Submitter

0 TRLR
`);

    const items = doc.getCompletions({ line: 7, character: 2 }, "1 ");

    expect(items).toContainEqual({
      label: "_SKYPEID",
      kind: "tag",
      detail: "http://xmlns.com/foaf/0.1/skypeID",
    });
    // Not NAME: SUBM allows one and the fixture already spends it.
    expect(items.map((item) => item.label)).toContain("EMAIL");
  });

  it("offers no root tags inside an extension subtree", () => {
    const doc = document(`0 HEAD
1 GEDC
2 VERS 7.0
1 SCHMA
2 TAG _SKYPEID http://xmlns.com/foaf/0.1/skypeID
0 @U1@ SUBM
1 _SKYPEID example.person

0 TRLR
`);

    expect(doc.getCompletions({ line: 7, character: 2 }, "2 ")).toEqual([]);
  });
});

describe("completion inside a DATE payload", () => {
  const offers = (line: string, body: string) => {
    const text = `0 HEAD\n1 GEDC\n2 VERS 7.0\n${body}${line}\n0 TRLR\n`;
    const at = text.slice(0, text.indexOf(line)).split("\n").length - 1;
    return document(text)
      .getCompletions({ line: at, character: line.length }, line)
      .map((item) => item.label);
  };
  const inBirth = (line: string) => offers(line, "0 @I1@ INDI\n1 BIRT\n");

  it("offers the calendars, the modifiers and the months at the start", () => {
    const labels = inBirth("2 DATE ");

    expect(labels).toContain("GREGORIAN");
    expect(labels).toContain("HEBREW");
    expect(labels).toContain("BET");
    expect(labels).toContain("JAN");
  });

  it("offers the months of the calendar in force, not the ones we know", () => {
    const labels = inBirth("2 DATE HEBREW 1 ");

    expect(labels).toContain("TSH");
    expect(labels).toContain("ELL");
    expect(labels).not.toContain("JAN");
  });

  it("offers the French Republican months after that calendar", () => {
    expect(inBirth("2 DATE FRENCH_R ")).toContain("VEND");
  });

  it("asks for the word that finishes a range or a period", () => {
    expect(inBirth("2 DATE BET 1900 ")).toContain("AND");
    expect(inBirth("2 DATE FROM 1900 ")).toContain("TO");
  });

  it("offers the epoch a calendar has, and none where it has none", () => {
    expect(inBirth("2 DATE 1 JAN 2000 ")).toEqual(["BCE"]);
    expect(inBirth("2 DATE HEBREW 1 TSH 5760 ")).toEqual([]);
  });

  it("offers nothing between a month and the year it needs", () => {
    expect(inBirth("2 DATE 1 JAN ")).toEqual([]);
  });

  it("offers an exact date its months, and no calendar to put them in", () => {
    expect(offers("1 DATE 1 ", "")).toContain("APR");
    expect(offers("1 DATE ", "")).toEqual([]);
  });
});
