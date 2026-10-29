import { describe, expect, it } from "vitest";

import { GedcomDocument } from "../document/gedcomDocument";
import { GedcomErrorCode } from "../types/errors";

const SCHMA = [
  "1 SCHMA",
  "2 TAG _APRX https://gedcom.io/terms/v7/month-APR",
  "2 TAG _FEBX https://gedcom.io/terms/v7/month-FEB",
  "2 TAG _JUL https://gedcom.io/terms/v7/cal-JULIAN",
  "2 TAG _MON https://example.com/month",
];

function errorsIn(version: string, header: string[], records: string[]) {
  return new GedcomDocument()
    .createDocument(
      [
        "0 HEAD",
        "1 GEDC",
        `2 VERS ${version}`,
        ...header,
        ...records,
        "0 TRLR",
        "",
      ].join("\n"),
    )
    .getErrors()
    .filter((error) => error.message.startsWith("Value for DATE"))
    .map((error) => `${error.code} ${error.level}: ${error.message}`);
}

function dateErrors(version: string, payload: string) {
  return errorsIn(version, version === "7.0" ? SCHMA : [], [
    "0 @I1@ INDI",
    "1 BIRT",
    `2 DATE ${payload}`,
  ]);
}

const codes = (errors: string[]) => errors.map((error) => error.slice(0, 6));

describe("a day its month does not have", () => {
  it("reports a day February does not have", () => {
    expect(dateErrors("7.0", "31 FEB 1900")).toEqual([
      "VAL014 error: Value for DATE names 31 FEB, and FEB has 28 days",
    ]);
  });

  it("judges a Julian date by the Julian leap-year rule", () => {
    expect(dateErrors("7.0", "JULIAN 29 FEB 1700")).toEqual([]);
    expect(codes(dateErrors("7.0", "29 FEB 1700"))).toEqual([
      GedcomErrorCode.ImpossibleDay,
    ]);
  });

  it("reads a 5.5.1 calendar escape", () => {
    expect(dateErrors("5.5.1", "@#DJULIAN@ 29 FEB 1700")).toEqual([]);
  });

  it("judges each date of a range in its own calendar", () => {
    expect(dateErrors("7.0", "FROM JULIAN 1 JAN 1700 TO 29 FEB 1900")).toEqual([
      "VAL014 error: Value for DATE names 29 FEB, and FEB has 28 days",
    ]);
  });

  it("leaves a calendar whose months it does not judge", () => {
    expect(dateErrors("5.5.1", "@#DROMAN@ 31 FEB 1900")).toEqual([]);
  });
});

describe("a day under an aliased month or calendar", () => {
  it("names the month an alias stands for", () => {
    expect(dateErrors("7.0", "31 _APRX 2000")).toEqual([
      "VAL014 error: Value for DATE names 31 APR, and APR has 30 days",
    ]);
  });

  it("judges an aliased month in an exact date", () => {
    expect(
      errorsIn("7.0", SCHMA, ["0 @I1@ INDI", "1 CHAN", "2 DATE 31 _APRX 2000"]),
    ).toEqual([
      "VAL014 error: Value for DATE names 31 APR, and APR has 30 days",
    ]);
  });

  it("judges an aliased month in a date period", () => {
    expect(
      errorsIn("7.0", SCHMA, [
        "0 @S1@ SOUR",
        "1 DATA",
        "2 EVEN BIRT",
        "3 DATE FROM 31 _APRX 2000",
      ]),
    ).toEqual([
      "VAL014 error: Value for DATE names 31 APR, and APR has 30 days",
    ]);
  });

  it("judges a date in an aliased Julian calendar by the Julian rule", () => {
    expect(dateErrors("7.0", "_JUL 29 FEB 1900")).toEqual([]);
  });

  it("binds an aliased calendar to its own date only", () => {
    expect(dateErrors("7.0", "FROM _JUL 29 FEB 1900 TO 29 FEB 1900")).toEqual([
      "VAL014 error: Value for DATE names 29 FEB, and FEB has 28 days",
    ]);
    expect(dateErrors("7.0", "BET _JUL 29 FEB 1900 AND 29 FEB 1900")).toEqual([
      "VAL014 error: Value for DATE names 29 FEB, and FEB has 28 days",
    ]);
  });

  it("reads an aliased calendar and an aliased month together", () => {
    expect(dateErrors("7.0", "_JUL 31 _APRX 1900")).toEqual([
      "VAL014 error: Value for DATE names 31 APR, and APR has 30 days",
    ]);
    expect(dateErrors("7.0", "_JUL 29 _FEBX 1900")).toEqual([]);
  });

  it("leaves an aliased month whose day exists", () => {
    expect(dateErrors("7.0", "30 _APRX 2000")).toEqual([]);
  });

  it("leaves an extension tag that is not an alias", () => {
    expect(dateErrors("7.0", "31 _MON 1900")).toEqual([]);
  });

  it("resolves no alias in GEDCOM 5.5.1, whatever SCHMA it writes", () => {
    expect(
      codes(
        errorsIn("5.5.1", SCHMA, [
          "0 @I1@ INDI",
          "1 BIRT",
          "2 DATE 31 _APRX 2000",
        ]),
      ),
    ).toEqual([GedcomErrorCode.IncorrectValue]);
  });
});
