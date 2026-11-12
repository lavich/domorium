import { describe, expect, it } from "vitest";

import { GedcomDocument } from "./gedcomDocument";
import type { ASTNode } from "../parser";

const G7 = "0 HEAD\n1 GEDC\n2 VERS 7.0\n";
const G551 =
  "0 HEAD\n1 GEDC\n2 VERS 5.5.1\n2 FORM LINEAGE-LINKED\n1 CHAR UTF-8\n";

function open(text: string) {
  const document = new GedcomDocument().createDocument(text);
  const person = document
    .getNodes()
    .find((node) => node.tokens.TAG?.value === "INDI") as ASTNode;
  return { document, person, name: person.children[0] };
}

function field(
  shape: ReturnType<GedcomDocument["getStructureShape"]>,
  tag: string,
) {
  return shape?.fields.find((candidate) => candidate.tag === tag);
}

describe("the fields of a structure", () => {
  it("lists the parts of a 7.0 name with TYPE as an enumeration", () => {
    const { document, name } = open(`${G7}0 @I1@ INDI\n1 NAME A /B/\n0 TRLR\n`);

    const shape = document.getStructureShape(name);

    expect(shape?.fields.map((entry) => entry.tag)).toEqual(
      expect.arrayContaining([
        "GIVN",
        "SURN",
        "NPFX",
        "NSFX",
        "SPFX",
        "NICK",
        "TYPE",
        "TRAN",
        "NOTE",
        "SNOTE",
        "SOUR",
      ]),
    );
    expect(field(shape, "TYPE")?.payload).toEqual({
      kind: "enum",
      values: expect.arrayContaining(["BIRTH", "MARRIED", "OTHER"]),
      multiple: false,
    });
    expect(shape?.payload).toEqual({ kind: "personal-name" });
    expect(shape?.payloadRequired).toBe(true);
  });

  it("says that a 5.5.1 multimedia format tolerates file extensions", () => {
    const { document } = open(`${G551}0 @I1@ INDI\n0 TRLR\n`);

    const file = document.getStructureShapeAtPath(["OBJE", "FILE"]);

    expect(field(file, "FORM")?.payload).toEqual({
      kind: "enum",
      values: ["bmp", "gif", "jpg", "ole", "pcx", "tif", "wav"],
      multiple: false,
      tolerates: "file-extension",
    });
  });

  it("lists FONE and ROMN, no TRAN, and one GIVN at most in a 5.5.1 name", () => {
    const { document, name } = open(
      `${G551}0 @I1@ INDI\n1 NAME A /B/\n0 TRLR\n`,
    );

    const shape = document.getStructureShape(name);

    expect(shape?.fields.map((entry) => entry.tag)).toEqual(
      expect.arrayContaining(["FONE", "ROMN"]),
    );
    expect(field(shape, "TRAN")).toBeUndefined();
    expect(field(shape, "GIVN")).toMatchObject({ min: 0, max: 1 });
    expect(field(shape, "NOTE")?.payload).toEqual({
      kind: "text-or-pointer",
      to: "NOTE",
    });
  });

  it("reports an unbounded field with no maximum", () => {
    const { document, name } = open(`${G7}0 @I1@ INDI\n1 NAME A /B/\n0 TRLR\n`);

    expect(field(document.getStructureShape(name), "NICK")).toMatchObject({
      min: 0,
      max: null,
    });
  });

  it("reports the kinds a widget is chosen by", () => {
    const { document, person } = open(`${G7}0 @I1@ INDI\n0 TRLR\n`);

    const birth = document.getStructureShape(person, "BIRT");

    expect(field(birth, "DATE")?.payload).toEqual({ kind: "date" });
    expect(field(birth, "PLAC")?.payload).toEqual({ kind: "text" });
    expect(field(birth, "AGE")?.payload).toEqual({ kind: "age" });
    expect(field(birth, "FAMC")?.payload).toEqual({
      kind: "pointer",
      to: "FAM",
    });
  });

  it("reports a minimum of one for a required substructure", () => {
    const { document } = open(`${G7}0 @I1@ INDI\n0 TRLR\n`);

    const translation = document.getStructureShapeAtPath([
      "INDI",
      "NAME",
      "TRAN",
    ]);

    expect(field(translation, "LANG")).toMatchObject({ min: 1, max: 1 });
  });

  it("reports nothing for a document checked against no dialect", () => {
    const { document, name } = open("0 @I1@ INDI\n1 NAME A /B/\n");

    expect(document.getStructureShape(name)).toBeUndefined();
    expect(document.getStructureShapeAtPath(["INDI", "NAME"])).toBeUndefined();
  });

  it("reports a fragment given a dialect by its options", () => {
    const document = new GedcomDocument().createDocument(
      "0 @I1@ INDI\n1 NAME A /B/\n",
      { fragment: true, dialect: "7.0" },
    );
    const name = document.getNodes()[0].children[0];

    expect(document.getStructureShape(name)?.fields.length).toBeGreaterThan(0);
  });
});

describe("a structure that is not in the text yet", () => {
  it("answers for NAME beneath a person who has none", () => {
    const { document, person } = open(`${G7}0 @I1@ INDI\n0 TRLR\n`);

    const shape = document.getStructureShape(person, "NAME");

    expect(shape?.payload).toEqual({ kind: "personal-name" });
    expect(field(shape, "GIVN")).toBeDefined();
  });

  it("answers nothing for a tag the dialect does not have there", () => {
    const { document, person } = open(`${G551}0 @I1@ INDI\n0 TRLR\n`);

    expect(document.getStructureShape(person, "TRAN")).toBeUndefined();
  });
});

describe("a structure by its schema path", () => {
  it("answers two levels that do not exist yet, in 7.0", () => {
    const { document } = open(`${G7}0 @I1@ INDI\n0 TRLR\n`);

    const shape = document.getStructureShapeAtPath(["INDI", "NAME", "TRAN"]);

    expect(shape?.fields.map((entry) => entry.tag)).toContain("LANG");
  });

  it("answers nothing for INDI.NAME.TRAN in 5.5.1", () => {
    const { document } = open(`${G551}0 @I1@ INDI\n0 TRLR\n`);

    expect(
      document.getStructureShapeAtPath(["INDI", "NAME", "TRAN"]),
    ).toBeUndefined();
  });

  it("answers nothing for an empty path", () => {
    const { document } = open(`${G7}0 @I1@ INDI\n0 TRLR\n`);

    expect(document.getStructureShapeAtPath([])).toBeUndefined();
  });
});

describe("whether a value may span lines", () => {
  it("lets a 7.0 note and given name hold a line break, and calls only the note prose", () => {
    const { document, name } = open(`${G7}0 @I1@ INDI\n1 NAME A /B/\n0 TRLR\n`);
    const shape = document.getStructureShape(name);

    expect(field(shape, "NOTE")).toMatchObject({
      lineBreaks: true,
      prose: true,
    });
    expect(field(shape, "GIVN")).toMatchObject({
      lineBreaks: true,
      prose: false,
    });
    expect(field(shape, "TYPE")).toMatchObject({
      lineBreaks: false,
      prose: false,
    });
  });

  it.each([
    ["7.0", G7],
    ["5.5.1", G551],
  ])("keeps a date on one line in %s", (_dialect, header) => {
    const { document, person } = open(`${header}0 @I1@ INDI\n0 TRLR\n`);

    expect(
      field(document.getStructureShape(person, "BIRT"), "DATE"),
    ).toMatchObject({
      lineBreaks: false,
    });
  });

  it("follows the 5.5.1 grammar, which continues a note and not a given name", () => {
    const { document, name } = open(
      `${G551}0 @I1@ INDI\n1 NAME A /B/\n0 TRLR\n`,
    );
    const shape = document.getStructureShape(name);

    expect(field(shape, "GIVN")).toMatchObject({
      lineBreaks: false,
      prose: false,
    });
    expect(field(shape, "NOTE")).toMatchObject({
      lineBreaks: true,
      prose: true,
    });
  });

  it("reports a note's translation as prose in 7.0", () => {
    const { document } = open(`${G7}0 @I1@ INDI\n0 TRLR\n`);

    expect(
      field(document.getStructureShapeAtPath(["INDI", "NOTE"]), "TRAN"),
    ).toMatchObject({ lineBreaks: true, prose: true });
  });

  it("reports an address as prose in both dialects", () => {
    for (const header of [G7, G551]) {
      const { document, person } = open(`${header}0 @I1@ INDI\n0 TRLR\n`);

      expect(
        field(document.getStructureShape(person, "RESI"), "ADDR"),
      ).toMatchObject({
        lineBreaks: true,
        prose: true,
      });
    }
  });
});
