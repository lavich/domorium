import { describe, expect, it } from "vitest";

import { GedcomDocument } from "../document/gedcomDocument";
import { GedcomErrorCode } from "../types/errors";

const SCHMA = [
  "1 SCHMA",
  "2 TAG _CAL https://example.com/calendar",
  "2 TAG _MON https://example.com/month",
  "2 TAG _EP https://example.com/epoch",
];

function dateErrors(version: string, payload: string) {
  return new GedcomDocument()
    .createDocument(
      [
        "0 HEAD",
        "1 GEDC",
        `2 VERS ${version}`,
        ...(version === "7.0" ? SCHMA : []),
        "0 @I1@ INDI",
        "1 BIRT",
        `2 DATE ${payload}`,
        "0 TRLR",
        "",
      ].join("\n"),
    )
    .getErrors()
    .filter((error) => error.message.startsWith("Value for DATE"))
    .map((error) => `${error.code} ${error.level}: ${error.message}`);
}

describe("a year the calendar does not number", () => {
  it("reports year 0 before the era in GEDCOM 7", () => {
    expect(dateErrors("7.0", "0 BCE")).toEqual([
      "VAL016 error: Value for DATE names year 0, and GREGORIAN has no year 0",
    ]);
  });

  it("reports it once at the end of a range that names it", () => {
    expect(dateErrors("7.0", "BET JULIAN 0 AND 10")).toEqual([
      "VAL016 error: Value for DATE names year 0, and JULIAN has no year 0",
    ]);
  });

  it.each(["1 JAN 0000", "0BC", "0/01 B.C."])(
    "reports %s in GEDCOM 5.5.1",
    (payload) => {
      expect(dateErrors("5.5.1", payload)).toEqual([
        "VAL016 error: Value for DATE names year 0, and GREGORIAN has no year 0",
      ]);
    },
  );

  it.each(["HEBREW 0", "_CAL 0", "1 BCE", "0 _MON 1900", "0 _EP"])(
    "leaves %s alone",
    (payload) => {
      expect(dateErrors("7.0", payload)).toEqual([]);
    },
  );

  it("reports a day and a year that are both impossible, each on its own", () => {
    expect(
      dateErrors("7.0", "30 FEB 0").map((error) => error.slice(0, 6)),
    ).toEqual([GedcomErrorCode.ImpossibleDay, GedcomErrorCode.ImpossibleYear]);
  });

  it("says only that a malformed date is malformed", () => {
    expect(
      dateErrors("7.0", "0 BCE BCE").map((error) => error.slice(0, 6)),
    ).toEqual([GedcomErrorCode.IncorrectValue]);
  });

  it("leaves a 5.5.1 calendar the schema describes no months for", () => {
    expect(dateErrors("5.5.1", "@#DROMAN@ 5 AUC 1000")).toEqual([]);
  });
});
