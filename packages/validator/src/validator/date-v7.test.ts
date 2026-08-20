import { describe, expect, it } from "vitest";
import { buildAst } from "../parser/ast";
import { ConfigurableLexer } from "../parser/lexer";
import g7validationJson from "../schemes/g7validation.json";
import { GedcomScheme } from "../schemes/schema-types";
import { collectExtensions, ExtensionContext } from "./extensions";
import {
  isValidDateExact,
  isValidDatePeriod,
  isValidDateValue,
} from "./date-v7";

const scheme: GedcomScheme = g7validationJson;

const declaring = (...definitions: string[]): ExtensionContext => {
  const text = [
    "0 HEAD",
    "1 SCHMA",
    ...definitions.map((d) => `2 TAG ${d}`),
  ].join("\n");
  const { tokens } = new ConfigurableLexer({ zeroBased: true }).tokenize(text);
  const { nodes } = buildAst(tokens, text);
  return collectExtensions(nodes, true, scheme).context;
};

const value = (v: string) => isValidDateValue(v, scheme);
const period = (v: string) => isValidDatePeriod(v, scheme);
const exact = (v: string) => isValidDateExact(v, scheme);

describe("date", () => {
  it("reads a bare year", () => {
    expect(value("2000")).toBe(true);
  });

  it("reads a day, a month and a year", () => {
    expect(value("1 JAN 2000")).toBe(true);
  });

  it("reads a month with no day", () => {
    expect(value("JAN 2000")).toBe(true);
  });

  it("requires a month beside a day", () => {
    expect(value("1 2000")).toBe(false);
  });

  it("requires a year", () => {
    expect(value("JAN")).toBe(false);
    expect(value("1 JAN")).toBe(false);
    expect(value("JULIAN")).toBe(false);
  });

  it("requires the year to be an integer", () => {
    expect(value("-100")).toBe(false);
    expect(value("20x0")).toBe(false);
  });

  it("reads each named calendar", () => {
    expect(value("GREGORIAN 1 JAN 2000")).toBe(true);
    expect(value("JULIAN 1 JAN 1700")).toBe(true);
    expect(value("HEBREW 1 TSH 5760")).toBe(true);
    expect(value("FRENCH_R 1 VEND 8")).toBe(true);
  });

  it("reads an extension calendar", () => {
    expect(value("_MYCAL 1900")).toBe(true);
    expect(value("_MYCAL 1 _MYMONTH 1900")).toBe(true);
  });

  it("holds a month to its calendar", () => {
    expect(value("HEBREW 1 JAN 5760")).toBe(false);
    expect(value("JULIAN 1 TSH 1700")).toBe(false);
  });

  it("reads BCE where the calendar declares it", () => {
    expect(value("1 JAN 2000 BCE")).toBe(true);
    expect(value("JULIAN 1700 BCE")).toBe(true);
  });

  it("holds an epoch to its calendar", () => {
    expect(value("HEBREW 5760 BCE")).toBe(false);
    expect(value("FRENCH_R 8 BCE")).toBe(false);
  });

  it("reads an extension month and an extension epoch", () => {
    expect(value("1 _MYMONTH 2000")).toBe(true);
    expect(value("2000 _MYEPOCH")).toBe(true);
  });

  it("reads the keywords case-sensitively", () => {
    expect(value("1 jan 2000")).toBe(false);
    expect(value("julian 1700")).toBe(false);
    expect(value("abt 1900")).toBe(false);
    expect(value("2000 bce")).toBe(false);
  });

  it("leaves a day the month cannot hold to the calendar check", () => {
    expect(value("31 FEB 2000")).toBe(true);
    expect(value("0 JAN 2000")).toBe(true);
  });

  it("rejects a trailing token", () => {
    expect(value("1 JAN 2000 XYZ")).toBe(false);
    expect(value("2000 2001")).toBe(false);
  });

  it("rejects an empty value", () => {
    expect(value("")).toBe(false);
    expect(value("   ")).toBe(false);
  });
});

describe("dateApprox", () => {
  it("reads each modifier", () => {
    expect(value("ABT 1900")).toBe(true);
    expect(value("CAL 1 JAN 1900")).toBe(true);
    expect(value("EST JULIAN 1700 BCE")).toBe(true);
  });

  it("rejects a modifier with no date", () => {
    expect(value("ABT")).toBe(false);
    expect(value("CAL JAN")).toBe(false);
  });

  it("rejects an approximated period", () => {
    expect(value("ABT FROM 1900 TO 1910")).toBe(false);
  });
});

describe("dateRange", () => {
  it("reads BET … AND …", () => {
    expect(value("BET 1900 AND 1910")).toBe(true);
    expect(value("BET 1 JAN 1900 AND 31 DEC 1910")).toBe(true);
  });

  it("gives each side of a range its own calendar", () => {
    expect(value("BET JULIAN 1700 AND HEBREW 5460")).toBe(true);
  });

  it("rejects BET without AND", () => {
    expect(value("BET 1900 1910")).toBe(false);
    expect(value("BET 1900")).toBe(false);
    expect(value("BET 1900 AND")).toBe(false);
  });

  it("rejects a third date in a range", () => {
    expect(value("BET 1900 AND 1910 AND 1920")).toBe(false);
  });

  it("reads AFT and BEF", () => {
    expect(value("AFT 1900")).toBe(true);
    expect(value("BEF JULIAN 1700")).toBe(true);
    expect(value("AFT")).toBe(false);
    expect(value("BEF JAN")).toBe(false);
  });

  it("rejects a bare AND", () => {
    expect(value("AND 1900")).toBe(false);
  });
});

describe("DatePeriod", () => {
  it("reads FROM … TO …", () => {
    expect(period("FROM 1900 TO 1910")).toBe(true);
    expect(value("FROM 1900 TO 1910")).toBe(true);
  });

  it("reads FROM with no TO", () => {
    expect(period("FROM 1900")).toBe(true);
  });

  it("reads a bare TO", () => {
    expect(period("TO 1910")).toBe(true);
    expect(value("TO 1910")).toBe(true);
  });

  it("binds a calendar to the date that follows it, not to the payload", () => {
    expect(period("FROM JULIAN 1670 TO 1800")).toBe(true);
    expect(period("FROM 1670 TO JULIAN 1800")).toBe(true);
    expect(period("FROM HEBREW TSH 5460 TO 1800")).toBe(true);
    expect(period("FROM HEBREW TSH 5460 TO TSH 5461")).toBe(false);
  });

  it("rejects FROM with no date", () => {
    expect(period("FROM")).toBe(false);
    expect(period("FROM TO 1910")).toBe(false);
    expect(period("FROM 1900 TO")).toBe(false);
  });

  it("rejects a third date in a period", () => {
    expect(period("FROM 1900 TO 1910 TO 1920")).toBe(false);
  });

  it("rejects what is not a period", () => {
    expect(period("1900")).toBe(false);
    expect(period("ABT 1900")).toBe(false);
    expect(period("BET 1900 AND 1910")).toBe(false);
    expect(period("")).toBe(false);
  });
});

describe("DateExact", () => {
  it("reads a day, a month and a year", () => {
    expect(exact("1 JAN 2000")).toBe(true);
  });

  it("requires all three", () => {
    expect(exact("2000")).toBe(false);
    expect(exact("JAN 2000")).toBe(false);
    expect(exact("1 JAN")).toBe(false);
    expect(exact("")).toBe(false);
  });

  it("takes no epoch", () => {
    expect(exact("1 JAN 2000 BCE")).toBe(false);
  });

  it("names no calendar", () => {
    expect(exact("GREGORIAN 1 JAN 2000")).toBe(false);
    expect(exact("1 TSH 5760")).toBe(false);
  });

  it("takes no modifier", () => {
    expect(exact("ABT 1 JAN 2000")).toBe(false);
    expect(exact("FROM 1 JAN 2000")).toBe(false);
  });
});

describe("an aliased extension tag", () => {
  it("resolves to the month it abbreviates", () => {
    const extensions = declaring("_M1 https://gedcom.io/terms/v7/month-JAN");
    expect(isValidDateValue("1 _M1 2000", scheme, extensions)).toBe(true);
    expect(isValidDateExact("1 _M1 2000", scheme, extensions)).toBe(true);
  });

  it("resolves to the calendar it abbreviates", () => {
    const extensions = declaring("_JUL https://gedcom.io/terms/v7/cal-JULIAN");
    expect(isValidDateValue("_JUL 1 JAN 1700 BCE", scheme, extensions)).toBe(
      true,
    );
    expect(value("_JUL 1 JAN 1700 BCE")).toBe(false);
  });

  it("is held to the calendar's own vocabulary", () => {
    const extensions = declaring("_M1 https://gedcom.io/terms/v7/month-JAN");
    expect(isValidDateValue("HEBREW 1 _M1 5760", scheme, extensions)).toBe(
      false,
    );
    expect(value("HEBREW 1 _M1 5760")).toBe(true);
  });

  it("stays an extension tag when it abbreviates nothing", () => {
    const extensions = declaring("_M1 https://example.com/month");
    expect(isValidDateValue("1 _M1 2000", scheme, extensions)).toBe(true);
    expect(isValidDateValue("HEBREW 1 _M1 5760", scheme, extensions)).toBe(
      true,
    );
  });
});
