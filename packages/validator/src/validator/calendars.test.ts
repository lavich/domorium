import { describe, expect, it } from "vitest";

import g551validation from "../schemes/g551validation.json";
import g7validation from "../schemes/g7validation.json";
import { GedcomTag } from "../schemes/schema-types";
import {
  calendarEscape,
  calendarNamed,
  dateTokens,
  permits,
  stripCalendarEscape,
  vocabularyOf,
} from "./calendars";

describe("the tokens of a date", () => {
  it("splits on whitespace", () => {
    expect(dateTokens("1 JAN 2000")).toEqual(["1", "JAN", "2000"]);
    expect(dateTokens("")).toEqual([]);
  });

  it("keeps an escape whole, including the space in FRENCH R", () => {
    expect(dateTokens("@#DFRENCH R@ 2 PLUV 1")).toEqual([
      "@#DFRENCH R@",
      "2",
      "PLUV",
      "1",
    ]);
  });

  // The atsign conformance file writes the escape with no space after it.
  it("keeps an escape whole where nothing separates it from the date", () => {
    expect(dateTokens("@#DJULIAN@1 JAN 2000")).toEqual([
      "@#DJULIAN@",
      "1",
      "JAN",
      "2000",
    ]);
  });
});

describe("the calendar a token names", () => {
  it("reads a bare name the schema describes", () => {
    expect(calendarNamed(g7validation, "JULIAN")).toBe("JULIAN");
    expect(calendarNamed(g7validation, "JAN")).toBeNull();
  });

  it("reads the escape 5.5.1 writes, described or not", () => {
    expect(calendarNamed(g551validation, "@#DFRENCH R@")).toBe("FRENCH R");
    expect(calendarNamed(g551validation, "@#DJULIAN AND SUCH@")).toBe(
      "JULIAN AND SUCH",
    );
  });

  it("writes a calendar the way 5.5.1 writes it", () => {
    expect(calendarEscape("JULIAN")).toBe("@#DJULIAN@");
  });
});

describe("the escape in front of a date", () => {
  it("gives the calendar and what follows it", () => {
    expect(stripCalendarEscape("@#DJULIAN@ 1 JAN 2000")).toEqual({
      calendar: "JULIAN",
      rest: "1 JAN 2000",
    });
  });

  it("leaves a date with no escape alone", () => {
    expect(stripCalendarEscape("1 JAN 2000")).toEqual({
      calendar: null,
      rest: "1 JAN 2000",
    });
  });

  it("reads only a leading escape, which is where 5.5.1 puts it", () => {
    expect(stripCalendarEscape("FROM @#DJULIAN@ 1700").calendar).toBeNull();
  });
});

describe("what a calendar permits", () => {
  it("reads the months and epochs from the scheme", () => {
    const gregorian = vocabularyOf(g7validation, GedcomTag("GREGORIAN"));

    expect(gregorian.months?.has("JAN")).toBe(true);
    expect(gregorian.months?.has("TSH")).toBe(false);
    expect(gregorian.epochs?.has("BCE")).toBe(true);
  });

  it("says nothing about a calendar the scheme does not describe", () => {
    expect(vocabularyOf(g7validation, GedcomTag("ROMAN"))).toEqual({
      months: null,
      epochs: null,
    });
  });

  it("distinguishes a calendar with no month from one with no entry", () => {
    expect(vocabularyOf(g551validation, GedcomTag("ROMAN")).months).toEqual(
      new Set(),
    );
  });

  it("admits an extension tag wherever a calendar constrains a slot", () => {
    const { months } = vocabularyOf(g7validation, GedcomTag("GREGORIAN"));

    expect(permits(months, "_THERMIDOR")).toBe(true);
    expect(permits(months, "THERMIDOR")).toBe(false);
    expect(permits(null, "JAN")).toBe(false);
  });
});
