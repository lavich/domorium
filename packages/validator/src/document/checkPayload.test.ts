import { describe, expect, it } from "vitest";

import { GedcomDocument } from "./gedcomDocument";
import { GedcomErrorCode } from "../types/errors";
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

function codes(problems: { code: string }[] | undefined) {
  return (problems ?? []).map((problem) => problem.code);
}

describe("checking one value without an edit", () => {
  const sevenName = `${G7}0 @I1@ INDI\n1 NAME A /B/\n0 TRLR\n`;
  const fiveName = `${G551}0 @I1@ INDI\n1 NAME A /B/\n2 GIVN A\n0 TRLR\n`;

  it("accepts a value that is valid", () => {
    const { document, name } = open(sevenName);

    expect(document.checkPayload(name, "GIVN", "Anna")).toEqual([]);
    expect(document.checkPayload(name, "TYPE", "BIRTH")).toEqual([]);
  });

  it("names a value outside an enumeration", () => {
    const { document, name } = open(sevenName);

    expect(codes(document.checkPayload(name, "TYPE", "nonsense"))).toEqual([
      GedcomErrorCode.ShouldBeSetValue,
    ]);
  });

  it("names one occurrence too many, and not when it replaces the one held", () => {
    const { document, name } = open(fiveName);
    const held = name.children[0];

    expect(codes(document.checkPayload(name, "GIVN", "Bo"))).toEqual([
      GedcomErrorCode.ManyOccurrences,
    ]);
    expect(document.checkPayload(name, "GIVN", "Bo", held)).toEqual([]);
  });

  it("names a tag the dialect does not define there", () => {
    const { document, name } = open(fiveName);

    expect(codes(document.checkPayload(name, "TRAN", "x"))).toEqual([
      GedcomErrorCode.UnknownTag,
    ]);
  });

  it("names a value that fails its datatype and one that names an impossible day", () => {
    const { document, person } = open(`${G7}0 @I1@ INDI\n0 TRLR\n`);
    const path = ["INDI", "BIRT"];

    expect(codes(document.checkPayload(path, "DATE", "not a date"))).toEqual([
      GedcomErrorCode.IncorrectValue,
    ]);
    expect(codes(document.checkPayload(path, "DATE", "31 FEB 1900"))).toEqual([
      GedcomErrorCode.ImpossibleDay,
    ]);
    expect(document.checkPayload(person, "BIRT", "Y")).toEqual([]);
  });

  it("names a missing value where the dialect needs one", () => {
    const { document, name } = open(fiveName);

    expect(codes(document.checkPayload(name, "NICK", ""))).toEqual([
      GedcomErrorCode.MissingValue,
    ]);
  });

  it("reads a pointer against the records of the document", () => {
    const { document, name } = open(
      `${G7}0 @I1@ INDI\n1 NAME A /B/\n0 @S1@ SOUR\n0 TRLR\n`,
    );

    expect(document.checkPayload(name, "SOUR", "@S1@")).toEqual([]);
    expect(codes(document.checkPayload(name, "SOUR", "@S9@"))).toEqual([
      GedcomErrorCode.UnresolvedXref,
    ]);
    expect(codes(document.checkPayload(name, "SOUR", "text"))).toEqual([
      GedcomErrorCode.MissingRef,
    ]);
  });

  it("accepts text or a pointer for a 5.5.1 note", () => {
    const { document, name } = open(
      `${G551}0 @I1@ INDI\n1 NAME A /B/\n0 @N1@ NOTE\n0 TRLR\n`,
    );

    expect(document.checkPayload(name, "NOTE", "@N1@")).toEqual([]);
    expect(document.checkPayload(name, "NOTE", "plain text")).toEqual([]);
  });

  it("answers by a schema path with no occurrences held", () => {
    const { document } = open(`${G7}0 @I1@ INDI\n0 TRLR\n`);

    expect(
      codes(document.checkPayload(["INDI", "NAME", "TRAN"], "LANG", "!!")),
    ).toEqual([GedcomErrorCode.IncorrectValue]);
  });

  it("names a line break in a value that may not span lines", () => {
    const { document } = open(`${G7}0 @I1@ INDI\n0 TRLR\n`);

    expect(
      codes(document.checkPayload(["INDI", "BIRT"], "DATE", "1 JAN\n1900")),
    ).toEqual([GedcomErrorCode.SpansLines]);
    expect(document.checkPayload(["INDI", "BIRT"], "NOTE", "one\ntwo")).toEqual(
      [],
    );
  });

  it("answers nothing for a document checked against no dialect", () => {
    const { document, name } = open("0 @I1@ INDI\n1 NAME A /B/\n");

    expect(document.checkPayload(name, "GIVN", "Anna")).toBeUndefined();
  });

  it.each([
    [G7, "1 NAME A /B/", "2 TYPE nonsense", "TYPE", "nonsense"],
    [G7, "1 NAME A /B/", "2 SOUR @S9@", "SOUR", "@S9@"],
    [G551, "1 NAME A /B/\n2 GIVN A", "2 GIVN B", "GIVN", "B"],
    [G551, "1 NAME A /B/", "2 TRAN x", "TRAN", "x"],
    [G551, "1 NAME A /B/", "2 NICK ", "NICK", ""],
  ])(
    "agrees with the diagnostics of a document that holds the line (%#)",
    (header, held, line, tag, value) => {
      const text = `${header}0 @I1@ INDI\n${held}\n${line}\n0 TRLR\n`;
      const { document, name } = open(
        `${header}0 @I1@ INDI\n${held}\n0 TRLR\n`,
      );
      const lineNumber = text.split("\n").indexOf(line);
      const written = new GedcomDocument()
        .createDocument(text)
        .getErrors()
        .filter(
          (error) =>
            error.range.start.line === lineNumber &&
            error.code !== GedcomErrorCode.EmptyEvent,
        );

      expect(codes(written)).not.toEqual([]);
      expect(codes(document.checkPayload(name, tag, value)).sort()).toEqual(
        codes(written).sort(),
      );
    },
  );
});

describe("a value where the standard allows none, and an emptied record", () => {
  const sevenNote = `${G7}0 @N1@ SNOTE First line\n0 @I1@ INDI\n1 BIRT\n2 PLAC Paris\n3 MAP\n4 LATI N1\n4 LONG E1\n0 TRLR\n`;

  function nodeAt(document: GedcomDocument, line: number): ASTNode {
    const walk = (nodes: ASTNode[]): ASTNode | undefined => {
      for (const node of nodes) {
        if (node.range.start.line === line) {
          return node;
        }
        const found = walk(node.children);
        if (found) {
          return found;
        }
      }
      return undefined;
    };
    return walk(document.getNodes()) as ASTNode;
  }

  it("names a value for a map, with the tag in data", () => {
    const document = new GedcomDocument().createDocument(sevenNote);
    const problems = document.checkPayload(
      nodeAt(document, 6),
      "MAP",
      "oops",
      nodeAt(document, 7),
    );

    expect(problems).toEqual([
      expect.objectContaining({
        code: GedcomErrorCode.ValueNotAllowed,
        data: { tag: "MAP" },
      }),
    ]);
  });

  it("names a value for a person record and accepts one for a shared note", () => {
    const document = new GedcomDocument().createDocument(sevenNote);

    expect(
      codes(document.checkPayload([], "INDI", "x", nodeAt(document, 4))),
    ).toEqual([GedcomErrorCode.ValueNotAllowed]);
    expect(
      document.checkPayload([], "SNOTE", "Other", nodeAt(document, 3)),
    ).toEqual([]);
  });

  it("accepts an empty value where none is allowed", () => {
    const document = new GedcomDocument().createDocument(sevenNote);

    expect(document.checkPayload([], "TRLR", "", nodeAt(document, 10))).toEqual(
      [],
    );
  });

  it("names an emptied 7.0 shared note that holds nothing, and not one that holds a source", () => {
    const bare = new GedcomDocument().createDocument(sevenNote);
    const sourced = new GedcomDocument().createDocument(
      `${G7}0 @N1@ SNOTE First line\n1 SOUR @S1@\n0 @S1@ SOUR\n0 TRLR\n`,
    );

    expect(bare.checkPayload([], "SNOTE", "", nodeAt(bare, 3))).toEqual([
      expect.objectContaining({
        code: GedcomErrorCode.EmptyStructure,
        data: { tag: "SNOTE" },
      }),
    ]);
    expect(sourced.checkPayload([], "SNOTE", "", nodeAt(sourced, 3))).toEqual(
      [],
    );
  });

  it("names an emptied 5.5.1 note record as a missing value", () => {
    const document = new GedcomDocument().createDocument(
      `${G551}0 @N1@ NOTE a\n0 TRLR\n`,
    );

    expect(
      codes(document.checkPayload([], "NOTE", "", nodeAt(document, 5))),
    ).toEqual([GedcomErrorCode.MissingValue]);
  });

  it("lets a 5.5.1 family event carry a description", () => {
    const document = new GedcomDocument().createDocument(
      `${G551}0 @F1@ FAM\n0 TRLR\n`,
    );

    expect(document.checkPayload(["FAM"], "EVEN", "Common Law")).toEqual([]);
  });

  it("leaves the diagnostics of a file unchanged", () => {
    const withValue = new GedcomDocument().createDocument(
      `${G7}0 @I1@ INDI\n1 BIRT\n2 PLAC Paris\n3 MAP oops\n4 LATI N1\n4 LONG E1\n0 TRLR\n`,
    );
    const emptyNote = new GedcomDocument().createDocument(
      `${G7}0 @N1@ SNOTE\n0 TRLR\n`,
    );

    expect(withValue.getErrors()).toEqual([]);
    expect(emptyNote.getErrors()).toEqual([]);
  });

  it("lets a 5.5.1 individual event carry a description, as EVENT_DESCRIPTOR says", () => {
    const document = new GedcomDocument().createDocument(
      `${G551}0 @I1@ INDI\n0 TRLR\n`,
    );

    expect(
      document.checkPayload(["INDI"], "EVEN", "Appointed Chairperson"),
    ).toEqual([]);
  });

  it("names a value of spaces for a map and keeps a problem found before it", () => {
    const document = new GedcomDocument().createDocument(sevenNote);
    const place = nodeAt(document, 6);

    expect(codes(document.checkPayload(place, "MAP", "  "))).toEqual([
      GedcomErrorCode.ManyOccurrences,
      GedcomErrorCode.ValueNotAllowed,
    ]);
  });
});
