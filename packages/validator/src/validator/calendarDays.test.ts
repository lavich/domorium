import { describe, expect, it } from "vitest";

import g551validation from "../schemes/g551validation.json";
import g7validation from "../schemes/g7validation.json";
import { GedcomScheme, GedcomTag } from "../schemes/schema-types";
import {
  daysInMonth,
  impossibleDays,
  isLeapYear,
  LENGTHS,
} from "./calendarDays";

const days = (value: string) =>
  impossibleDays(g7validation, value).map(
    (found) => `${found.day} ${found.month}`,
  );
const days551 = (value: string) =>
  impossibleDays(g551validation, value).map(
    (found) => `${found.day} ${found.month}`,
  );

describe("how long a month is", () => {
  it("gives every month the length it has", () => {
    expect(daysInMonth("JAN", 1900, "GREGORIAN")).toBe(31);
    expect(daysInMonth("APR", 1900, "GREGORIAN")).toBe(30);
    expect(daysInMonth("DEC", 1900, "GREGORIAN")).toBe(31);
  });

  it("shortens February in a year that is not leap", () => {
    expect(daysInMonth("FEB", 1900, "GREGORIAN")).toBe(28);
    expect(daysInMonth("FEB", 2024, "GREGORIAN")).toBe(29);
  });

  it("gives February its longest length when the year is unknown", () => {
    expect(daysInMonth("FEB", null, "GREGORIAN")).toBe(29);
  });

  it("knows nothing of a month that is not in this calendar", () => {
    expect(daysInMonth("TSH", 1900, "GREGORIAN")).toBeNull();
  });
});

describe("which years are leap", () => {
  it("follows the Gregorian rule about centuries", () => {
    expect(isLeapYear(1900, "GREGORIAN")).toBe(false);
    expect(isLeapYear(2000, "GREGORIAN")).toBe(true);
    expect(isLeapYear(2024, "GREGORIAN")).toBe(true);
    expect(isLeapYear(2023, "GREGORIAN")).toBe(false);
  });

  it("follows the Julian rule, which has no exception for them", () => {
    expect(isLeapYear(1900, "JULIAN")).toBe(true);
    expect(isLeapYear(1700, "JULIAN")).toBe(true);
  });
});

describe("a day the calendar does not have", () => {
  it("catches the typo this is all for", () => {
    expect(days("31 FEB 1900")).toEqual(["31 FEB"]);
  });

  it("catches a day carried over from a longer month", () => {
    expect(days("31 APR 1880")).toEqual(["31 APR"]);
    expect(days("31 JUN 1880")).toEqual(["31 JUN"]);
  });

  it("catches a day outside any month at all", () => {
    expect(days("99 JAN 1900")).toEqual(["99 JAN"]);
    expect(days("0 JAN 1900")).toEqual(["0 JAN"]);
  });

  it("catches the 29th of a February that had 28", () => {
    expect(days("29 FEB 1900")).toEqual(["29 FEB"]);
    expect(days("29 FEB 2023")).toEqual(["29 FEB"]);
  });

  it("leaves the 29th alone in a year that had one", () => {
    expect(days("29 FEB 2000")).toEqual([]);
    expect(days("29 FEB 2024")).toEqual([]);
  });

  it("judges a Julian date by the Julian rule", () => {
    expect(days("JULIAN 29 FEB 1700")).toEqual([]);
    expect(days("29 FEB 1700")).toEqual(["29 FEB"]);
  });

  it("reads the calendar 5.5.1 writes as an escape", () => {
    expect(days("@#DJULIAN@ 29 FEB 1700")).toEqual([]);
    expect(days("@#DGREGORIAN@ 29 FEB 1700")).toEqual(["29 FEB"]);
    expect(days("@#DHEBREW@ 30 TSH 5760")).toEqual([]);
  });

  it("says nothing about a calendar whose months it does not know", () => {
    expect(days("HEBREW 30 TSH 5760")).toEqual([]);
    expect(days("FRENCH_R 30 VEND 1")).toEqual([]);
  });

  it("reads a day through every modifier the grammar allows", () => {
    expect(days("ABT 31 FEB 1900")).toEqual(["31 FEB"]);
    expect(days("BEF 31 FEB 1900")).toEqual(["31 FEB"]);
    expect(days("FROM 31 FEB 1900 TO 1910")).toEqual(["31 FEB"]);
    expect(days("BET 31 FEB 1900 AND 31 APR 1910")).toEqual([
      "31 FEB",
      "31 APR",
    ]);
  });

  it("keeps each date in a range under its own calendar", () => {
    expect(days("FROM JULIAN 29 FEB 1700 TO GREGORIAN 29 FEB 1700")).toEqual([
      "29 FEB",
    ]);
  });

  // A calendar binds to the date that follows it, so the date after the keyword
  // names none and is Gregorian — it was read in the first date's calendar, and
  // the Julian rule has no exception for a century.
  it("does not carry a calendar past the keyword that ends its date", () => {
    expect(days("FROM JULIAN 1 JAN 1700 TO 29 FEB 1900")).toEqual(["29 FEB"]);
    expect(days("BET JULIAN 1 JAN 1700 AND 29 FEB 1900")).toEqual(["29 FEB"]);
    expect(days551("FROM @#DJULIAN@ 1 JAN 1700 TO 29 FEB 1900")).toEqual([
      "29 FEB",
    ]);
  });

  it("still reads a calendar that follows the keyword", () => {
    expect(days("FROM 1 JAN 1900 TO JULIAN 29 FEB 1700")).toEqual([]);
    expect(days551("FROM 1 JAN 1900 TO @#DJULIAN@ 29 FEB 1700")).toEqual([]);
  });

  it("leaves a date with no day alone", () => {
    expect(days("FEB 1900")).toEqual([]);
    expect(days("1900")).toEqual([]);
  });

  it("does not read a phrase as a date", () => {
    expect(days("INT 1900 (born 31 FEB by the old reckoning)")).toEqual([]);
    expect(days("(unknown)")).toEqual([]);
  });

  it("gives February its longest length before the common era", () => {
    expect(days("29 FEB 1000 BCE")).toEqual([]);
    expect(days("30 FEB 1000 BCE")).toEqual(["30 FEB"]);
  });

  // #239: the validity check and this one knew different spellings.
  it.each(["BC", "B.C.", "B.C", "bce"])(
    "gives February its longest length before %s",
    (epoch) => {
      expect(days(`29 FEB 1000 ${epoch}`)).toEqual([]);
    },
  );

  it("reads an escape whose calendar name carries a space", () => {
    expect(days551("@#DFRENCH R@ 30 VEND 1")).toEqual([]);
    expect(days551("@#DJULIAN@ 29 FEB 1700")).toEqual([]);
  });

  it("says what the month does have, not only that the day is wrong", () => {
    expect(impossibleDays(g7validation, "31 FEB 1900")[0]).toEqual({
      day: 31,
      month: "FEB",
      length: 28,
    });
  });
});

// #207: the month tags are the schema's, the lengths are here, and this is the
// seam between them. A month either schema names and this table does not is a
// day check silently switched off.
describe("the months the lengths are stated for", () => {
  const schemes: [string, GedcomScheme][] = [
    ["g7validation.json", g7validation],
    ["g551validation.json", g551validation],
  ];

  it.each(schemes)(
    "covers every month %s gives GREGORIAN and JULIAN",
    (_name, scheme) => {
      const named = ["GREGORIAN", "JULIAN"].flatMap((calendar) =>
        Object.keys(scheme.calendar[GedcomTag(calendar)]?.months ?? {}),
      );

      expect(named.length).toBeGreaterThan(0);
      expect(named.filter((month) => LENGTHS[month] === undefined)).toEqual([]);
    },
  );

  it("states a length for no month either schema leaves out", () => {
    const named = new Set(
      schemes.flatMap(([, scheme]) =>
        ["GREGORIAN", "JULIAN"].flatMap((calendar) =>
          Object.keys(scheme.calendar[GedcomTag(calendar)]?.months ?? {}),
        ),
      ),
    );

    expect(Object.keys(LENGTHS).filter((month) => !named.has(month))).toEqual(
      [],
    );
  });
});
