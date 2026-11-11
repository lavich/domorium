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
