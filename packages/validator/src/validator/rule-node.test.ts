import { describe, expect, test } from "vitest";
import { RuleNode } from "./rule-node";
import { ConfigurableLexer } from "../parser/lexer";
import { buildAst } from "../parser/ast";
import g7validationJson from "../schemes/g7validation.json";
import g551validation from "../schemes/g551validation.json";

const astBuilder = (text: string) => {
  const lexingResult = new ConfigurableLexer({ zeroBased: true }).tokenize(
    text,
  );
  return buildAst(lexingResult.tokens, text);
};

describe("payload for VERS 7", () => {
  describe("rule Y|NULL", () => {
    test("should pass MARR with Y", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @F1@ FAM
1 MARR Y
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const MARR = nodes[1].children[0];
      const errs = ruleEngine.validate(MARR);
      expect(errs.length).toBe(0);
    });

    test("should pass MARR with children", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @F1@ FAM
1 MARR
2 DATE 1 APR 1911
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const MARR = nodes[1].children[0];
      const errs = ruleEngine.validate(MARR);
      expect(errs.length).toBe(0);
    });

    test("should pass MARR with children", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @F1@ FAM
1 MARR
2 DATE 1 APR 1911
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const MARR = nodes[1].children[0];
      const errs = ruleEngine.validate(MARR);
      expect(errs.length).toBe(0);
    });

    test("should return error because value incorrect", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @F1@ FAM
1 MARR incorrect_value
2 DATE 1 APR 1911
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const MARR = nodes[1].children[0];
      const errs = ruleEngine.validate(MARR);
      expect(errs.length).toBe(1);
      expect(errs[0].range.start.line).toBe(4);
    });
  });

  describe("rule String", () => {
    test("should pass NAME with payload", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 NAME Gomer
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const NAME = nodes[1].children[0];
      const errs = ruleEngine.validate(NAME);
      expect(errs.length).toBe(0);
    });

    test("should return error because Name has not payload", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 NAME
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const NAME = nodes[1].children[0];
      const errs = ruleEngine.validate(NAME);
      expect(errs.length).toBe(1);
    });
  });

  // Issue #90: Text is *anychar, so an omitted payload is valid and was being
  // reported as missing across 61 of the 182 payload types.
  describe("omitted payload", () => {
    test.each(["EVEN", "NOTE", "OCCU", "TITL"])(
      "should pass %s with no payload",
      async (tag) => {
        const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 ${tag}
0 TRLR
`);
        const ruleEngine = new RuleNode(g7validationJson, pointers);
        const node = nodes[1].children[0];
        const errs = ruleEngine.validate(node);
        expect(errs).toEqual([]);
      },
    );

    test("should pass AGE with no payload and a PHRASE instead", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 DEAT
2 AGE
3 PHRASE in his early twenties
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const AGE = nodes[1].children[0].children[0];
      const errs = ruleEngine.validate(AGE);
      expect(errs).toEqual([]);
    });

    test("should pass DATE with no payload and a PHRASE instead", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 DEAT
2 DATE
3 PHRASE during the war
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const DATE = nodes[1].children[0].children[0];
      const errs = ruleEngine.validate(DATE);
      expect(errs).toEqual([]);
    });

    test("should pass SOUR DATA EVEN DATE period with no payload", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @S1@ SOUR
1 DATA
2 EVEN BIRT
3 DATE
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const DATE = nodes[1].children[0].children[0].children[0];
      const errs = ruleEngine.validate(DATE);
      expect(errs).toEqual([]);
    });

    test("should pass PLAC with no payload", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 DEAT
2 PLAC
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const PLAC = nodes[1].children[0].children[0];
      const errs = ruleEngine.validate(PLAC);
      expect(errs).toEqual([]);
    });

    // Language, Name and DateExact do not admit the empty string, so the
    // permission must not spread to every payload that happens to be absent.
    test("should still report LANG with no payload", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 LANG
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const LANG = nodes[0].children[0];
      const errs = ruleEngine.validate(LANG);
      expect(errs.length).toBe(1);
    });

    test("should still report DATE exact with no payload", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 DATE
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const DATE = nodes[0].children[0];
      const errs = ruleEngine.validate(DATE);
      expect(errs.length).toBe(1);
    });
  });

  describe("rule Select", () => {
    test("should pass SEX with payload", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 SEX  M 
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const SEX = nodes[1].children[0];
      const errs = ruleEngine.validate(SEX);
      expect(errs.length).toBe(0);
    });

    test("should return error because SEX has not correct payload", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @i1@ INDI
1 SEX NON_ENUM_TAG
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const SEX = nodes[1].children[0];
      const errs = ruleEngine.validate(SEX);
      expect(errs.length).toBe(1);
    });

    test("should pass an enumeration value that is an extension tag", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 SEX _INTERSEX
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const SEX = nodes[1].children[0];
      const errs = ruleEngine.validate(SEX);
      expect(errs.length).toBe(0);
    });
  });

  describe("rule Multiselect", () => {
    test("should pass RESN with payload", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 RESN LOCKED,  PRIVACY
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const RESN = nodes[1].children[0];
      const errs = ruleEngine.validate(RESN);
      expect(errs.length).toBe(0);
    });

    test("should return error because RESN has not correct payload", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 RESN non_correct_value
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const RESN = nodes[1].children[0];
      const errs = ruleEngine.validate(RESN);
      expect(errs.length).toBe(1);
    });

    test("should pass a list mixing standard and extension values", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 RESN LOCKED, _MINE
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const RESN = nodes[1].children[0];
      const errs = ruleEngine.validate(RESN);
      expect(errs.length).toBe(0);
    });

    // The specification's own counter-example: PARENT is a standard value of
    // ROLE, not of RESN.
    test("should return error for a standard value from another set", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 RESN PARENT
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const RESN = nodes[1].children[0];
      const errs = ruleEngine.validate(RESN);
      expect(errs.length).toBe(1);
    });
  });

  describe("rule Time", () => {
    test("should pass TIME with payload", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 DATE 9 MAR 2007
2 TIME 15:19:55
1 GEDC
2 VERS 7.0
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const TIME = nodes[0].children[0].children[0];
      const errs = ruleEngine.validate(TIME);
      expect(errs.length).toBe(0);
    });

    test("should return error because TIME has not correct payload", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 DATE 9 MAR 2007
2 TIME 15:1
1 GEDC
2 VERS 7.0
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const TIME = nodes[0].children[0].children[0];
      const errs = ruleEngine.validate(TIME);
      expect(errs.length).toBe(1);
    });

    test.each(["8:38", "15:43:20.48", "15:43:20.48Z", "15:43:20Z"])(
      "should pass TIME with %s",
      async (time) => {
        const { nodes, pointers } = astBuilder(`0 HEAD
1 DATE 9 MAR 2007
2 TIME ${time}
1 GEDC
2 VERS 7.0
0 TRLR
`);
        const ruleEngine = new RuleNode(g7validationJson, pointers);
        const TIME = nodes[0].children[0].children[0];
        const errs = ruleEngine.validate(TIME);
        expect(errs.length).toBe(0);
      },
    );

    test.each(["25:00", "15:43:20X", "15:60:00"])(
      "should return error because %s is not a correct time",
      async (time) => {
        const { nodes, pointers } = astBuilder(`0 HEAD
1 DATE 9 MAR 2007
2 TIME ${time}
1 GEDC
2 VERS 7.0
0 TRLR
`);
        const ruleEngine = new RuleNode(g7validationJson, pointers);
        const TIME = nodes[0].children[0].children[0];
        const errs = ruleEngine.validate(TIME);
        expect(errs.length).toBe(1);
      },
    );
  });

  describe("rule Age", () => {
    test.each([
      "35y 11m 8w 21d",
      "9y",
      "< 1y",
      "> 25y",
      "CHILD",
      "INFANT",
      "STILLBORN",
    ])("should pass AGE with %s", async (age) => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 DEAT
2 AGE ${age}
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const AGE = nodes[1].children[0].children[0];
      const errs = ruleEngine.validate(AGE);
      expect(errs.length).toBe(0);
    });

    test("should return error because AGE has not correct payload", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 DEAT
2 AGE not_an_age
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const AGE = nodes[1].children[0].children[0];
      const errs = ruleEngine.validate(AGE);
      expect(errs.length).toBe(1);
    });
  });

  describe("rule DateExact", () => {
    test("should pass DATE with 9 MAR 2007", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 DATE 9 MAR 2007
1 GEDC
2 VERS 7.0
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const DATE = nodes[0].children[0];
      const errs = ruleEngine.validate(DATE);
      expect(errs.length).toBe(0);
    });

    test("should return error because DATE is missing day and month", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 DATE 2007
1 GEDC
2 VERS 7.0
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const DATE = nodes[0].children[0];
      const errs = ruleEngine.validate(DATE);
      expect(errs.length).toBe(1);
    });

    // Issue #92: DateExact is day, month and year in the Gregorian calendar and
    // nothing else — no calendar, no epoch, and no slashed year, which 7.0
    // removed. The v5.5.1 escape is not GEDCOM 7 syntax at all.
    test.each([
      "1 JAN 1857/58",
      "@#DHEBREW@ 1 TISHREI 5761",
      "@#DGREGORIAN@ 9 MAR 2007",
      "@#DGREGORIAN@ 2007",
      "GREGORIAN 9 MAR 2007",
      "9 MAR 2007 BCE",
      "HEBREW 1 TSH 5761",
    ])("should return error because %s is not an exact date", async (date) => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 DATE ${date}
1 GEDC
2 VERS 7.0
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const DATE = nodes[0].children[0];
      const errs = ruleEngine.validate(DATE);
      expect(errs.length).toBe(1);
    });
  });

  describe("rule Date", () => {
    test.each([
      "9 MAR 2007",
      "ABT 1950",
      "CAL 1950",
      "EST 1950",
      "BEF 1950",
      "AFT 1950",
      "BET 1900 AND 1910",
      "BET 9 MAR 1900 AND 10 APR 1910",
      "FROM 1900 TO 1910",
      "TO 1910",
      "100 BCE",
      // Issue #92: a calendar is a bare word in GEDCOM 7, and it binds to the
      // date that follows it rather than to the payload.
      "GREGORIAN 9 MAR 2007",
      "JULIAN 1401",
      "JULIAN OCT 1401",
      "JULIAN 12 AUG 1401 BCE",
      "HEBREW 1 TSH 5761",
      "FRENCH_R 2 VEND 8",
      "FROM JULIAN 1670 TO 1800",
      "BET 1950 AND GREGORIAN 302",
      "ABT HEBREW 5761",
      // Extension calendars, months and epochs, declared or not: the schema
      // they belong to is the only thing that could judge them.
      "_UNKNOWN 87",
      "_CALENDAR 8 _MONTH 190 _EPOCH",
    ])("should pass DATE with %s", async (date) => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @F1@ FAM
1 MARR
2 DATE ${date}
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const DATE = nodes[1].children[0].children[0];
      const errs = ruleEngine.validate(DATE);
      expect(errs.length).toBe(0);
    });

    test("should return error because DATE is not a valid date value", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @F1@ FAM
1 MARR
2 DATE not a date
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const DATE = nodes[1].children[0].children[0];
      const errs = ruleEngine.validate(DATE);
      expect(errs.length).toBe(1);
    });

    test("should return error because explicit Gregorian escape still requires valid grammar", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @F1@ FAM
1 MARR
2 DATE @#DGREGORIAN@ not a date
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const DATE = nodes[1].children[0].children[0];
      const errs = ruleEngine.validate(DATE);
      expect(errs.length).toBe(1);
    });

    test.each([
      "BET 1900 1910",
      "FROM 1900 TO",
      "(a(b)c)",
      // All of these are v5.5.1 and were removed in 7.0: the slashed year and
      // the INT and phrase forms by Appendix A, the escape by the date grammar,
      // which names a calendar as a bare word instead.
      "1857/58",
      "INT 1950 (around 1950)",
      "(unknown)",
      "@#DGREGORIAN@ 9 MAR 2007",
      "@#DHEBREW@ 1 TISHREI 5761",
      // A year is required, and a month must belong to the calendar in force.
      "MAR",
      "HEBREW 1 JAN 5761",
      "JULIAN 1 VEND 8",
    ])(
      "should return error because %s is not a valid date value",
      async (date) => {
        const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @F1@ FAM
1 MARR
2 DATE ${date}
0 TRLR
`);
        const ruleEngine = new RuleNode(g7validationJson, pointers);
        const DATE = nodes[1].children[0].children[0];
        const errs = ruleEngine.validate(DATE);
        expect(errs.length).toBe(1);
      },
    );
  });

  describe("rule DatePeriod", () => {
    test.each([
      "FROM 1900 TO 1910",
      "TO 1920",
      "FROM 1900",
      // Issue #92: a calendar binds to the date after it, so the two ends of a
      // period can sit in different calendars.
      "FROM GREGORIAN 1900 TO 1910",
      "FROM JULIAN 1670 TO GREGORIAN 1800",
      "TO HEBREW 5761",
    ])("should pass DATE with %s", async (date) => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @S1@ SOUR
1 DATA
2 EVEN BIRT
3 DATE ${date}
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const DATE = nodes[1].children[0].children[0].children[0];
      const errs = ruleEngine.validate(DATE);
      expect(errs.length).toBe(0);
    });

    test("should return error because DATE has no FROM/TO period marker", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @S1@ SOUR
1 DATA
2 EVEN BIRT
3 DATE 1900
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const DATE = nodes[1].children[0].children[0].children[0];
      const errs = ruleEngine.validate(DATE);
      expect(errs.length).toBe(1);
    });

    test.each([
      "GREGORIAN 1900",
      // The v5.5.1 escape is not GEDCOM 7 syntax, with or without a marker.
      "@#DGREGORIAN@ 1900",
      "@#DGREGORIAN@ FROM 1900 TO 1910",
      "@#DHEBREW@ FROM 1 TISHREI 5761",
    ])("should return error because %s is not a period", async (date) => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @S1@ SOUR
1 DATA
2 EVEN BIRT
3 DATE ${date}
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const DATE = nodes[1].children[0].children[0].children[0];
      const errs = ruleEngine.validate(DATE);
      expect(errs.length).toBe(1);
    });
  });

  describe("rule PersonalName", () => {
    test.each(["Homer /Simpson/", "Homer /Simpson/ Jr.", "Homer Simpson"])(
      "should pass NAME with %s",
      async (name) => {
        const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 NAME ${name}
0 TRLR
`);
        const ruleEngine = new RuleNode(g7validationJson, pointers);
        const NAME = nodes[1].children[0];
        const errs = ruleEngine.validate(NAME);
        expect(errs.length).toBe(0);
      },
    );

    test("should return error because NAME has unbalanced slashes", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 NAME Homer /Simpson
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const NAME = nodes[1].children[0];
      const errs = ruleEngine.validate(NAME);
      expect(errs.length).toBe(1);
    });
  });

  describe("rule MediaType", () => {
    test.each([
      "image/jpeg",
      "text/plain",
      "application/vnd.google-earth.kml+xml",
    ])("should pass FORM with %s", async (mediaType) => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @M1@ OBJE
1 FILE image.jpg
2 FORM ${mediaType}
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const FORM = nodes[1].children[0].children[0];
      const errs = ruleEngine.validate(FORM);
      expect(errs.length).toBe(0);
    });

    test("should return error because FORM is not a media type", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @M1@ OBJE
1 FILE image.jpg
2 FORM not_a_media_type
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const FORM = nodes[1].children[0].children[0];
      const errs = ruleEngine.validate(FORM);
      expect(errs.length).toBe(1);
    });
  });

  describe("rule Latitude/Longitude", () => {
    const SAMPLE = `0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 BIRT
2 PLAC Springfield
3 MAP
4 LATI N18.150944
4 LONG W46.6
0 TRLR
`;

    test("should pass correct LATI/LONG", async () => {
      const { nodes, pointers } = astBuilder(SAMPLE);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const MAP = nodes[1].children[0].children[0].children[0];
      const errs = [
        ...ruleEngine.validate(MAP.children[0]),
        ...ruleEngine.validate(MAP.children[1]),
      ];
      expect(errs.length).toBe(0);
    });

    test("should return error for LATI without N/S prefix", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 BIRT
2 PLAC Springfield
3 MAP
4 LATI 18.150944
4 LONG W46.6
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const MAP = nodes[1].children[0].children[0].children[0];
      const errs = ruleEngine.validate(MAP.children[0]);
      expect(errs.length).toBe(1);
    });

    test("should return error for LONG without E/W prefix", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 BIRT
2 PLAC Springfield
3 MAP
4 LATI N18.150944
4 LONG 46.6
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const MAP = nodes[1].children[0].children[0].children[0];
      const errs = ruleEngine.validate(MAP.children[1]);
      expect(errs.length).toBe(1);
    });
  });

  describe("rule LanguageTag", () => {
    test.each([
      "en",
      "en-US",
      "ru-RU",
      "zh-Hans",
      "zh-Hans-CN",
      "sr-Latn-RS",
      "i-klingon",
    ])("should pass LANG with %s", async (lang) => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 LANG ${lang}
1 GEDC
2 VERS 7.0
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const LANG = nodes[0].children[0];
      const errs = ruleEngine.validate(LANG);
      expect(errs.length).toBe(0);
    });

    test("should return error because LANG is not a valid language tag", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 LANG not_a_lang_tag!
1 GEDC
2 VERS 7.0
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const LANG = nodes[0].children[0];
      const errs = ruleEngine.validate(LANG);
      expect(errs.length).toBe(1);
    });
  });

  describe("rule Xref", () => {
    const SAMPLE = `
0 HEAD
1 GEDC
2 VERS 7.0
0 @Homer_Simpson@ INDI
0 @F0000@ FAM
1 HUSB @Homer_Simpson@
1 WIFE @Marge_Simpson@
0 TRLR
`;
    const { nodes, pointers } = astBuilder(SAMPLE);
    const ruleEngine = new RuleNode(g7validationJson, pointers);

    test("should pass xref when is is exist", async () => {
      const HUSB = nodes[2].children[0];
      const errs = ruleEngine.validate(HUSB);
      expect(errs.length).toBe(0);
    });

    test("should return error because WIFE has not pointer", async () => {
      const WIFE = nodes[2].children[1];
      const errs = ruleEngine.validate(WIFE);
      expect(errs.length).toBe(1);
    });

    // Issue #90: "should be POINTER" told two users nothing. A program that
    // writes a URL where a citation belongs needs to hear what belongs there.
    test("should name the record kind when the payload is not a pointer", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 SOUR https://www.openarchieven.nl/saa:5833c92c
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const SOUR = nodes[1].children[0];

      const errs = ruleEngine.validate(SOUR);

      expect(errs).toHaveLength(1);
      expect(errs[0].message).toBe(
        'Value for SOUR should be a pointer to a SOUR record, written as "@xref@"',
      );
    });

    test("should name the candidates when the xref resolves to nothing", async () => {
      const WIFE = nodes[2].children[1];

      const errs = ruleEngine.validate(WIFE);

      expect(errs).toHaveLength(1);
      expect(errs[0].code).toBe("unresolved-xref");
      expect(errs[0].message).toBe(
        "Value for WIFE should be in set [@Homer_Simpson@]",
      );
    });

    test("should pass @VOID@ pointer with no children (deliberately empty reference)", async () => {
      const { nodes: voidNodes, pointers: voidPointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @F1@ FAM
1 CHIL @VOID@
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, voidPointers);
      const CHIL = voidNodes[1].children[0];
      const errs = ruleEngine.validate(CHIL);
      expect(errs.length).toBe(0);
    });

    test("should pass @VOID@ pointer with a PHRASE child describing the omitted reference", async () => {
      const { nodes: voidNodes, pointers: voidPointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @F1@ FAM
1 CHIL @VOID@
2 PHRASE Second child
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, voidPointers);
      const CHIL = voidNodes[1].children[0];
      const errs = ruleEngine.validate(CHIL);
      expect(errs.length).toBe(0);
    });
  });

  describe("candidate list in a message", () => {
    // The message ends up in an editor tooltip, which sizes itself to its
    // content. An uncapped list of every xref in the document made that
    // tooltip wider than the screen.
    test("should list only the first candidates and count the rest", async () => {
      const lines = ["0 HEAD", "1 GEDC", "2 VERS 7.0"];
      for (let index = 1; index <= 60; index += 1) {
        lines.push(`0 @I${index}@ INDI`);
      }
      lines.push("0 @I99@ INDI", "1 ASSO @NOBODY@", "2 ROLE FRIEND", "0 TRLR");
      const { nodes, pointers } = astBuilder(lines.join("\n"));
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const ASSO = nodes[61].children[0];

      const errs = ruleEngine.validate(ASSO);

      expect(errs).toHaveLength(1);
      expect(errs[0].message).toBe(
        "Value for ASSO should be in set [@I1@, @I2@, @I3@, @I4@, @I5@, " +
          "@I6@, @I7@, @I8@, @I9@, @I10@, … 51 more]",
      );
    });

    test("should list a short set in full", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 SEX NOPE
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const SEX = nodes[1].children[0];

      const errs = ruleEngine.validate(SEX);

      expect(errs[0].message).toBe(
        "Value for SEX should be in set [F, M, U, X]",
      );
    });
  });

  describe("rule TagDef", () => {
    test("should pass a declaration with a tag and an absolute URI", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
1 SCHMA
2 TAG _SKYPEID http://xmlns.com/foaf/0.1/skypeID
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const TAG = nodes[0].children[1].children[0];
      const errs = ruleEngine.validate(TAG);
      expect(errs.length).toBe(0);
    });

    test("should return error because the declaration has no URI", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
1 SCHMA
2 TAG _SKYPEID
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const TAG = nodes[0].children[1].children[0];
      const errs = ruleEngine.validate(TAG);
      expect(errs.length).toBe(1);
      expect(errs[0].level).toBe("error");
    });

    test("should return error because the tag has no underscore prefix", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
1 SCHMA
2 TAG SKYPEID http://xmlns.com/foaf/0.1/skypeID
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const TAG = nodes[0].children[1].children[0];
      const errs = ruleEngine.validate(TAG);
      expect(errs.length).toBe(1);
      expect(errs[0].level).toBe("error");
    });
  });
});

describe("payload for VERS 5.5.1", () => {
  describe("rule Y|NULL", () => {
    test("should pass MARR with Y", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 5.5.1
0 @F1@ FAM
1 MARR Y
0 TRLR
`);
      const ruleEngine = new RuleNode(g551validation, pointers);
      const MARR = nodes[1].children[0];
      const errs = ruleEngine.validate(MARR);
      expect(errs.length).toBe(0);
    });

    test("should pass MARR with children", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 5.5.1
0 @F1@ FAM
1 MARR
2 DATE 1 APR 1911
0 TRLR
`);
      const ruleEngine = new RuleNode(g551validation, pointers);
      const MARR = nodes[1].children[0];
      const errs = ruleEngine.validate(MARR);
      expect(errs.length).toBe(0);
    });

    test("should pass MARR with children", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 5.5.1
0 @F1@ FAM
1 MARR
2 DATE 1 APR 1911
0 TRLR
`);
      const ruleEngine = new RuleNode(g551validation, pointers);
      const MARR = nodes[1].children[0];
      const errs = ruleEngine.validate(MARR);
      expect(errs.length).toBe(0);
    });

    test("should return error because value incorrect", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 5.5.1
0 @F1@ FAM
1 MARR incorrect_value
2 DATE 1 APR 1911
0 TRLR
`);
      const ruleEngine = new RuleNode(g551validation, pointers);
      const MARR = nodes[1].children[0];
      const errs = ruleEngine.validate(MARR);
      expect(errs.length).toBe(1);
      expect(errs[0].range.start.line).toBe(4);
    });
  });

  describe("rule String", () => {
    test("should pass NAME with payload", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME Gomer
0 TRLR
`);
      const ruleEngine = new RuleNode(g551validation, pointers);
      const NAME = nodes[1].children[0];
      const errs = ruleEngine.validate(NAME);
      expect(errs.length).toBe(0);
    });

    test("should return error because Name has not payload", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME
0 TRLR
`);
      const ruleEngine = new RuleNode(g551validation, pointers);
      const NAME = nodes[1].children[0];
      const errs = ruleEngine.validate(NAME);
      expect(errs.length).toBe(1);
    });

    // GEDCOM 7's "a payload may be omitted if its data type allows the empty
    // string" has no counterpart here: v5.5.1 sizes its string payloads
    // {SIZE=1:…}. Both versions share the xsd:string payload URI, so this
    // guards the version boundary rather than the tag.
    test.each(["OCCU", "TITL"])(
      "should return error because %s has no payload",
      async (tag) => {
        const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 ${tag}
0 TRLR
`);
        const ruleEngine = new RuleNode(g551validation, pointers);
        const node = nodes[1].children[0];
        const errs = ruleEngine.validate(node);
        expect(errs.length).toBe(1);
      },
    );
  });

  describe("rule Time", () => {
    test("should pass TIME with payload", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 DATE 9 MAR 2007
2 TIME 15:19:55
1 GEDC
2 VERS 5.5.1
0 TRLR
`);
      const ruleEngine = new RuleNode(g551validation, pointers);
      const TIME = nodes[0].children[0].children[0];
      const errs = ruleEngine.validate(TIME);
      expect(errs.length).toBe(0);
    });

    test("should return error because TIME has not correct payload", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 DATE 9 MAR 2007
2 TIME 15:1
1 GEDC
2 VERS 5.5.1
0 TRLR
`);
      const ruleEngine = new RuleNode(g551validation, pointers);
      const TIME = nodes[0].children[0].children[0];
      const errs = ruleEngine.validate(TIME);
      expect(errs.length).toBe(1);
    });

    test.each(["8:38", "15:43:20.48"])(
      "should pass TIME with %s",
      async (time) => {
        const { nodes, pointers } = astBuilder(`0 HEAD
1 DATE 9 MAR 2007
2 TIME ${time}
1 GEDC
2 VERS 5.5.1
0 TRLR
`);
        const ruleEngine = new RuleNode(g551validation, pointers);
        const TIME = nodes[0].children[0].children[0];
        const errs = ruleEngine.validate(TIME);
        expect(errs.length).toBe(0);
      },
    );

    test("should return error because the GEDCOM 7-only Z (UTC) suffix is not valid in 5.5.1", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 DATE 9 MAR 2007
2 TIME 15:43:20Z
1 GEDC
2 VERS 5.5.1
0 TRLR
`);
      const ruleEngine = new RuleNode(g551validation, pointers);
      const TIME = nodes[0].children[0].children[0];
      const errs = ruleEngine.validate(TIME);
      expect(errs.length).toBe(1);
    });
  });

  describe("rule Xref", () => {
    const SAMPLE = `
0 HEAD
1 GEDC
2 VERS 5.5.1
0 @Homer_Simpson@ INDI
1 OBJE
2 FORM URL
1 OBJE
0 @F0000@ FAM
1 HUSB @Homer_Simpson@
1 WIFE @Marge_Simpson@
0 TRLR
`;
    const { nodes, pointers } = astBuilder(SAMPLE);
    const ruleEngine = new RuleNode(g551validation, pointers);

    test("should pass xref when is is exist", async () => {
      const HUSB = nodes[2].children[0];
      const errs = ruleEngine.validate(HUSB);
      expect(errs.length).toBe(0);
    });

    test("should return error because WIFE has not pointer", async () => {
      const WIFE = nodes[2].children[1];
      const errs = ruleEngine.validate(WIFE);
      expect(errs.length).toBe(1);
    });

    test("should pass when object has children", async () => {
      const OBJE1 = nodes[1].children[0];
      const errs = ruleEngine.validate(OBJE1);
      expect(errs.length).toBe(0);
    });

    test("should error when object has not children and xref", async () => {
      const OBJE2 = nodes[1].children[1];
      const errs = ruleEngine.validate(OBJE2);
      expect(errs.length).toBe(1);
    });
  });

  describe("rule DateExact", () => {
    test("should pass DATE with exact date", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 DATE 9 MAR 2007
1 GEDC
2 VERS 5.5.1
0 TRLR
`);
      const ruleEngine = new RuleNode(g551validation, pointers);
      const DATE = nodes[0].children[0];
      const errs = ruleEngine.validate(DATE);
      expect(errs.length).toBe(0);
    });

    test("should return error because DATE is missing day and month", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 DATE 2007
1 GEDC
2 VERS 5.5.1
0 TRLR
`);
      const ruleEngine = new RuleNode(g551validation, pointers);
      const DATE = nodes[0].children[0];
      const errs = ruleEngine.validate(DATE);
      expect(errs.length).toBe(1);
    });
  });

  describe("rule Date", () => {
    test("should pass MARR DATE with a date value", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 5.5.1
0 @F1@ FAM
1 MARR
2 DATE ABT 1950
0 TRLR
`);
      const ruleEngine = new RuleNode(g551validation, pointers);
      const DATE = nodes[1].children[0].children[0];
      const errs = ruleEngine.validate(DATE);
      expect(errs.length).toBe(0);
    });

    test("should return error because DATE is not a valid date value", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 5.5.1
0 @F1@ FAM
1 MARR
2 DATE not a date
0 TRLR
`);
      const ruleEngine = new RuleNode(g551validation, pointers);
      const DATE = nodes[1].children[0].children[0];
      const errs = ruleEngine.validate(DATE);
      expect(errs.length).toBe(1);
    });
  });

  describe("rule DatePeriod", () => {
    test("should pass SOUR DATA EVEN DATE with a period", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 5.5.1
0 @S1@ SOUR
1 DATA
2 EVEN BIRT
3 DATE FROM 1900 TO 1910
0 TRLR
`);
      const ruleEngine = new RuleNode(g551validation, pointers);
      const DATE = nodes[1].children[0].children[0].children[0];
      const errs = ruleEngine.validate(DATE);
      expect(errs.length).toBe(0);
    });

    test("should return error because DATE has no FROM/TO period marker", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 5.5.1
0 @S1@ SOUR
1 DATA
2 EVEN BIRT
3 DATE 1900
0 TRLR
`);
      const ruleEngine = new RuleNode(g551validation, pointers);
      const DATE = nodes[1].children[0].children[0].children[0];
      const errs = ruleEngine.validate(DATE);
      expect(errs.length).toBe(1);
    });
  });

  describe("getNodeType", () => {
    test("should resolve CONT to its universal type instead of throwing", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 NOTE hello
2 CONT world
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const NOTE = nodes[1].children[0];
      const CONT = NOTE.children[0];
      expect(() => ruleEngine.getNodeType(CONT)).not.toThrow();
      expect(ruleEngine.getNodeType(CONT)).toBe(
        "https://gedcom.io/terms/v7/CONT",
      );
    });

    test("should not throw for FORM/FILE under an inline (non-pointer) OBJE", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 OBJE
2 FORM URL
2 FILE http://example.com
0 TRLR
`);
      const ruleEngine = new RuleNode(g551validation, pointers);
      const OBJE = nodes[1].children[0];
      const FORM = OBJE.children[0];
      const FILE = OBJE.children[1];
      expect(() => ruleEngine.getNodeType(FORM)).not.toThrow();
      expect(() => ruleEngine.getNodeType(FILE)).not.toThrow();
    });

    test("should not throw for a tag unknown to the schema", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 _CUSTOM foo
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const CUSTOM = nodes[1].children[0];
      expect(() => ruleEngine.getNodeType(CUSTOM)).not.toThrow();
      expect(ruleEngine.getNodeType(CUSTOM)).toBe("");
    });
  });
});
