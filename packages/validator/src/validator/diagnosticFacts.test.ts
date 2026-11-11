import { describe, expect, it } from "vitest";

import { GedcomDocument } from "../document/gedcomDocument";
import type { ASTNode } from "../parser";
import { GedcomErrorCode } from "../types/errors";

const G7 = "0 HEAD\n1 GEDC\n2 VERS 7.0\n";
const G551 =
  "0 HEAD\n1 GEDC\n2 VERS 5.5.1\n2 FORM LINEAGE-LINKED\n1 CHAR UTF-8\n";

function errorsOf(text: string, code: GedcomErrorCode) {
  return new GedcomDocument()
    .createDocument(text)
    .getErrors()
    .filter((error) => error.code === code);
}

function dataOf(text: string, code: GedcomErrorCode) {
  return errorsOf(text, code).map((error) => error.data);
}

const person = (header: string, lines: string[]) =>
  [header + "0 @I1@ INDI", ...lines, "0 TRLR", ""].join("\n");

describe("the facts a diagnostic carries", () => {
  it("names the day, the month and the days the month has", () => {
    expect(
      dataOf(
        person(G7, ["1 BIRT", "2 DATE 31 FEB 1900"]),
        GedcomErrorCode.ImpossibleDay,
      ),
    ).toEqual([{ day: 31, month: "FEB", monthLength: 28 }]);
    expect(
      dataOf(
        person(G551, ["1 BIRT", "2 DATE 31 APR 1900"]),
        GedcomErrorCode.ImpossibleDay,
      ),
    ).toEqual([{ day: 31, month: "APR", monthLength: 30 }]);
  });

  it("names the year and the calendar", () => {
    expect(
      dataOf(
        person(G7, ["1 BIRT", "2 DATE 1 JAN 0"]),
        GedcomErrorCode.ImpossibleYear,
      ),
    ).toEqual([{ year: 0, calendar: "GREGORIAN" }]);
  });

  it("names the missing tag and its parent", () => {
    expect(
      dataOf(
        person(G7, ["1 NAME Maria", "2 TRAN Мария"]),
        GedcomErrorCode.MissingTag,
      ),
    ).toEqual([{ missingTag: "LANG", parentTag: "TRAN" }]);
  });

  it("names a missing trailer with no parent", () => {
    expect(dataOf(`${G7}0 @I1@ INDI\n`, GedcomErrorCode.MissingTag)).toEqual([
      { missingTag: "TRLR" },
    ]);
  });

  it("names nothing for a line with no tag", () => {
    const missing = errorsOf(
      person(G7, ["1"]),
      GedcomErrorCode.MissingTag,
    ).filter((error) => error.message === "Missing required tag");

    expect(missing.map((error) => error.data)).toEqual([undefined]);
  });

  it("names the tag meant by one written in the wrong case", () => {
    expect(
      dataOf(
        person(G7, ["1 NAME Bob", "2 nick Bobby"]),
        GedcomErrorCode.UnknownTag,
      ),
    ).toEqual([{ meantTag: "NICK" }]);
  });

  it("names no tag meant where case is not the mistake", () => {
    expect(
      dataOf(
        person(G7, ["1 NAME Bob", "2 NONSENSE x"]),
        GedcomErrorCode.UnknownTag,
      ),
    ).toEqual([undefined]);
  });

  it("names the undeclared extension tag", () => {
    expect(
      dataOf(person(G7, ["1 _X value"]), GedcomErrorCode.UndocumentedTag),
    ).toEqual([{ tag: "_X" }]);
  });

  it("keeps the facts through a payload checked without the document", () => {
    const document = new GedcomDocument().createDocument(
      person(G7, ["1 BIRT", "1 NAME Bob"]),
    );
    const [birth, name] = (
      document
        .getNodes()
        .find((node) => node.tokens.TAG?.value === "INDI") as ASTNode
    ).children;

    expect(
      document.checkPayload(birth, "DATE", "31 FEB 1900")?.map((p) => p.data),
    ).toEqual([{ day: 31, month: "FEB", monthLength: 28 }]);
    expect(
      document.checkPayload(name, "nick", "Bobby")?.map((p) => p.data),
    ).toEqual([{ meantTag: "NICK" }]);
    expect(document.checkPayload(birth, "_X", "x")?.map((p) => p.data)).toEqual(
      [{ tag: "_X" }],
    );
  });
});
