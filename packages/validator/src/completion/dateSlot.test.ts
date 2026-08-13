import { describe, expect, it } from "vitest";

import { dateSlot } from "./dateSlot";

const value = (typed: string) => dateSlot(typed, "value");
const period = (typed: string) => dateSlot(typed, "period");
const exact = (typed: string) => dateSlot(typed, "exact");

describe("where the cursor is in a date value", () => {
  it("opens with the calendars, the modifiers and the months", () => {
    const slot = value("");

    expect(slot.calendars).toBe(true);
    expect(slot.months).toBe("GREGORIAN");
    expect(slot.keywords).toContain("BET");
    expect(slot.keywords).toContain("ABT");
  });

  it("takes a modifier as the opening and starts a date after it", () => {
    const slot = value("ABT ");

    expect(slot.calendars).toBe(true);
    expect(slot.months).toBe("GREGORIAN");
    expect(slot.keywords).toEqual([]);
  });

  it("offers the months of the calendar that was named", () => {
    expect(value("HEBREW ").months).toBe("HEBREW");
    expect(value("FRENCH_R ").months).toBe("FRENCH_R");
    expect(value("JULIAN ").months).toBe("JULIAN");
  });

  it("stops offering calendars once one has been named", () => {
    expect(value("HEBREW ").calendars).toBe(false);
  });

  it("offers months after a number, which may yet turn out to be a day", () => {
    expect(value("1 ").months).toBe("GREGORIAN");
    expect(value("HEBREW 1 ").months).toBe("HEBREW");
  });

  it("offers epochs after a number, which may yet turn out to be a year", () => {
    expect(value("1900 ").epochs).toBe("GREGORIAN");
  });

  it("offers nothing between a month and its year", () => {
    expect(value("1 JAN ")).toEqual({
      calendars: false,
      months: null,
      epochs: null,
      keywords: [],
    });
  });

  it("offers the epochs once the year is there", () => {
    expect(value("1 JAN 2000 ").epochs).toBe("GREGORIAN");
    expect(value("HEBREW 1 TSH 5760 ").epochs).toBe("HEBREW");
  });

  it("offers nothing once an epoch has been named", () => {
    expect(value("1 JAN 2000 BCE ")).toEqual({
      calendars: false,
      months: null,
      epochs: null,
      keywords: [],
    });
  });

  it("asks for AND once the first date of a range is whole", () => {
    expect(value("BET 1900 ").keywords).toEqual(["AND"]);
    expect(value("BET 1 JAN 1900 ").keywords).toEqual(["AND"]);
  });

  it("does not ask for AND before the first date is whole", () => {
    expect(value("BET ").keywords).toEqual([]);
    expect(value("BET 1 JAN ").keywords).toEqual([]);
  });

  it("starts the second date of a range after the connector", () => {
    const slot = value("BET 1900 AND ");

    expect(slot.calendars).toBe(true);
    expect(slot.months).toBe("GREGORIAN");
    expect(slot.keywords).toEqual([]);
  });

  it("keeps each date of a range under its own calendar", () => {
    expect(value("BET JULIAN 1700 AND HEBREW 1 ").months).toBe("HEBREW");
  });

  it("asks for TO after the first date of a period", () => {
    expect(value("FROM 1900 ").keywords).toEqual(["TO"]);
    expect(value("FROM 1900 TO ").keywords).toEqual([]);
  });

  it("asks nothing more after a period that opened with TO", () => {
    expect(value("TO 1900 ").keywords).toEqual([]);
  });

  it("reads the word being typed as a filter rather than as a token", () => {
    expect(value("HEBREW T").months).toBe("HEBREW");
    expect(value("BE").keywords).toContain("BET");
  });
});

describe("where the cursor is in a date period", () => {
  it("opens with FROM and TO alone", () => {
    expect(period("").keywords).toEqual(["FROM", "TO"]);
  });

  it("still names the calendars and months it may take", () => {
    expect(period("").calendars).toBe(true);
    expect(period("FROM HEBREW ").months).toBe("HEBREW");
  });
});

describe("where the cursor is in an exact date", () => {
  it("offers the months, and only after the day", () => {
    expect(exact("1 ").months).toBe("GREGORIAN");
    expect(exact("").months).toBeNull();
    expect(exact("1 APR ").months).toBeNull();
  });

  it("offers no calendar and no epoch, which the grammar does not admit", () => {
    expect(exact("1 ").calendars).toBe(false);
    expect(exact("1 APR 1911 ").epochs).toBeNull();
  });
});
