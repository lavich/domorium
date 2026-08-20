import { describe, expect, test } from "vitest";
import { PAYLOAD_FIELD_TYPES, RuleNode } from "./rule-node";
import { GedcomScheme, GedcomType } from "../schemes/schema-types";
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

    // The payload is optional, so an empty MARR is not an error; but a line
    // with neither a value nor a subordinate line is what the Y convention
    // exists to protect against, so it is not silent either.
    test("should warn on MARR with neither payload nor substructures", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @F1@ FAM
1 MARR
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const MARR = nodes[1].children[0];
      const errs = ruleEngine.validate(MARR);
      expect(errs).toHaveLength(1);
      expect(errs[0].code).toBe("VAL010");
      expect(errs[0].level).toBe("warning");
    });

    test("should pass MARR with a NOTE and no payload", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @F1@ FAM
1 MARR
2 NOTE No record found in the parish register
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const MARR = nodes[1].children[0];
      const errs = ruleEngine.validate(MARR);
      expect(errs).toEqual([]);
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

  describe("rule nonNegativeInteger", () => {
    const validate = (payload: string) => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 NCHI ${payload}
0 TRLR
`);
      return new RuleNode(g7validationJson, pointers).validate(
        nodes[1].children[0],
      );
    };

    test.each(["3", "0", "007"])("should pass %s", async (payload) => {
      expect(validate(payload)).toEqual([]);
    });

    test.each(["-1", "abc", "3.7", "12abc", "1e3", "Infinity", ""])(
      "should return error for %s",
      async (payload) => {
        expect(validate(payload)).toHaveLength(1);
      },
    );
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

    test.each(["not_an_age", "<8y", ">8y", "8Y"])(
      "should return error because AGE %s breaks v7's required delimiter or case",
      async (age) => {
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
        expect(errs.length).toBe(1);
      },
    );
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

    // Issue #249: the message listed the xrefs that were not the problem and
    // never stated the one that was.
    test("should state that no record of that type carries the xref", async () => {
      const WIFE = nodes[2].children[1];

      const errs = ruleEngine.validate(WIFE);

      expect(errs).toHaveLength(1);
      expect(errs[0].code).toBe("unresolved-xref");
      expect(errs[0].message).toBe("No INDI record carries @Marge_Simpson@");
    });

    test("should keep carrying the xref and the record tag for a quick fix", async () => {
      const WIFE = nodes[2].children[1];

      const errs = ruleEngine.validate(WIFE);

      expect(errs[0].data).toEqual({
        xref: "@Marge_Simpson@",
        requiredRecordTag: "INDI",
      });
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
    // Issue #249: a pointer's set is the population of the document, so a
    // sample of it said nothing about the line that failed. Issue #190 saw the
    // same message list 1707 xrefs.
    test("should name no candidate for a pointer, however many the document holds", async () => {
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
      expect(errs[0].message).toBe("No INDI record carries @NOBODY@");
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

    test("should read the same when the document declares no such record at all", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 SOUR @S1@
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const SOUR = nodes[1].children[0];

      const errs = ruleEngine.validate(SOUR);

      expect(errs[0].message).toBe("No SOUR record carries @S1@");
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
  // A one-line note and a citation carrying its description were each reported
  // as a malformed pointer.
  describe("rule pointer or text", () => {
    const noteIn = (document: string) => {
      const { nodes, pointers } = astBuilder(document);
      const ruleEngine = new RuleNode(g551validation, pointers);
      return ruleEngine.validate(nodes[1].children[0]);
    };

    test("should pass NOTE carrying the text itself", async () => {
      expect(
        noteIn(`0 HEAD
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NOTE plain text here
0 TRLR
`),
      ).toEqual([]);
    });

    test("should pass NOTE with no payload at all", async () => {
      expect(
        noteIn(`0 HEAD
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NOTE
0 TRLR
`),
      ).toEqual([]);
    });

    test("should pass NOTE pointing at a record that exists", async () => {
      expect(
        noteIn(`0 HEAD
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NOTE @N1@
0 @N1@ NOTE text
0 TRLR
`),
      ).toEqual([]);
    });

    test("should pass SOUR carrying the description itself", async () => {
      expect(
        noteIn(`0 HEAD
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 SOUR Parish register, Warsaw, vol 3 p 41
0 TRLR
`),
      ).toEqual([]);
    });

    test("should report SOUR pointing at a record that does not exist", async () => {
      expect(
        noteIn(`0 HEAD
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 SOUR @S9@
0 TRLR
`),
      ).toMatchObject([{ code: "unresolved-xref" }]);
    });

    test("should report NOTE pointing at a record that does not exist", async () => {
      expect(
        noteIn(`0 HEAD
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NOTE @N9@
0 TRLR
`),
      ).toMatchObject([{ code: "unresolved-xref" }]);
    });
  });

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

  // Written for #109: the grammar gives INDI's EVEN no payload at all, and
  // spells the family one `[<EVENT_DESCRIPTOR> | <NULL>]`. Both were declared
  // as strings, and a string payload in v5.5.1 is a required one.
  describe("rule EVEN", () => {
    test.each([["0 @I1@ INDI"], ["0 @F1@ FAM"]])(
      "should pass a bare EVEN under %s",
      async (record) => {
        const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 5.5.1
${record}
1 EVEN
2 TYPE Unknown
0 TRLR
`);
        const ruleEngine = new RuleNode(g551validation, pointers);
        const EVEN = nodes[1].children[0];
        const errs = ruleEngine.validate(EVEN);
        expect(errs).toEqual([]);
      },
    );

    test("should pass a FAM EVEN carrying a descriptor", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 5.5.1
0 @F1@ FAM
1 EVEN Marriage banns read
0 TRLR
`);
      const ruleEngine = new RuleNode(g551validation, pointers);
      const EVEN = nodes[1].children[0];
      const errs = ruleEngine.validate(EVEN);
      expect(errs).toEqual([]);
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

  // #233: v7's grammar judged a 5.5.1 age.
  describe("rule Age", () => {
    const ageIn = (age: string) => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 DEAT
2 AGE ${age}
0 TRLR
`);
      const ruleEngine = new RuleNode(g551validation, pointers);
      return ruleEngine.validate(nodes[1].children[0].children[0]);
    };

    test.each(["<8y", ">8y", "< 8y", "> 8y", "8y", "8Y", "4y 8m 10d"])(
      "should pass AGE with %s",
      async (age) => {
        expect(ageIn(age)).toEqual([]);
      },
    );

    test.each(["CHILD", "child", "INFANT", "Infant", "STILLBORN"])(
      "should pass AGE with %s",
      async (age) => {
        expect(ageIn(age)).toEqual([]);
      },
    );

    test("should return error because AGE has not correct payload", async () => {
      expect(ageIn("not_an_age").length).toBe(1);
    });
  });

  // #112: these carry a closed value set in the specification, and the payload
  // types reached the switch's default branch, where anything non-empty passes.
  describe("rule Select", () => {
    const valueIn = (document: string, path: number[]) => {
      const { nodes, pointers } = astBuilder(document);
      let node = nodes[path[0]];
      for (const step of path.slice(1)) {
        node = node.children[step];
      }
      return new RuleNode(g551validation, pointers).validate(node);
    };

    const indi = (lines: string) => `0 HEAD
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
${lines}0 @F1@ FAM
0 TRLR
`;

    test.each([
      [
        "QUAY",
        "3",
        indi("1 BIRT\n2 SOUR a citation\n3 QUAY 3\n"),
        [1, 0, 0, 0],
      ],
      ["PEDI", "birth", indi("1 FAMC @F1@\n2 PEDI birth\n"), [1, 0, 0]],
      ["RESN", "privacy", indi("1 RESN privacy\n"), [1, 0]],
      ["RESN", "confidential", indi("1 RESN confidential\n"), [1, 0]],
      [
        "STAT",
        "challenged",
        indi("1 FAMC @F1@\n2 STAT challenged\n"),
        [1, 0, 0],
      ],
      [
        "ADOP",
        "BOTH",
        indi("1 ADOP\n2 FAMC @F1@\n3 ADOP BOTH\n"),
        [1, 0, 0, 0],
      ],
    ])("should pass %s with %s", async (_tag, _value, document, path) => {
      expect(valueIn(document, path)).toEqual([]);
    });

    test.each([
      [
        "QUAY",
        "9",
        indi("1 BIRT\n2 SOUR a citation\n3 QUAY 9\n"),
        [1, 0, 0, 0],
      ],
      ["PEDI", "nonsense", indi("1 FAMC @F1@\n2 PEDI nonsense\n"), [1, 0, 0]],
      ["RESN", "whatever", indi("1 RESN whatever\n"), [1, 0]],
      ["STAT", "nonsense", indi("1 FAMC @F1@\n2 STAT nonsense\n"), [1, 0, 0]],
      [
        "ADOP",
        "nonsense",
        indi("1 ADOP\n2 FAMC @F1@\n3 ADOP nonsense\n"),
        [1, 0, 0, 0],
      ],
    ])("should report %s with %s", async (_tag, _value, document, path) => {
      expect(valueIn(document, path).length).toBe(1);
    });

    const objeForm = (value: string) => `0 HEAD
1 GEDC
2 VERS 5.5.1
0 @O1@ OBJE
1 FILE portrait
2 FORM ${value}
0 TRLR
`;

    test.each(["jpg", "tif", "wav"])(
      "should pass OBJE.FILE.FORM with %s",
      async (value) => {
        expect(valueIn(objeForm(value), [1, 0, 0])).toEqual([]);
      },
    );

    // 5.5 spelled these jpeg and tiff; 5.5.1 spells them jpg and tif, and
    // exporters that changed the version line did not always change these.
    test.each(["jpeg", "tiff", "png", "exe"])(
      "should report OBJE.FILE.FORM with %s",
      async (value) => {
        expect(valueIn(objeForm(value), [1, 0, 0]).length).toBe(1);
      },
    );

    const ordinance = (tag: string, value: string) => `0 HEAD
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 ${tag}
2 STAT ${value}
0 TRLR
`;

    test.each([
      ["BAPL", "COMPLETED"],
      ["CONL", "PRE-1970"],
      ["ENDL", "STILLBORN"],
      ["SLGC", "BIC"],
    ])("should pass %s.STAT with %s", async (tag, value) => {
      expect(valueIn(ordinance(tag, value), [1, 0, 0])).toEqual([]);
    });

    // The LDS statuses are upper case where PEDI and RESN are lower, so a
    // validator that folded case would accept a file that mixes them.
    test.each([
      ["BAPL", "completed"],
      ["ENDL", "BIC"],
      ["SLGC", "CANCELED"],
      ["SLGC", "nonsense"],
    ])("should report %s.STAT with %s", async (tag, value) => {
      expect(valueIn(ordinance(tag, value), [1, 0, 0]).length).toBe(1);
    });

    test("should pass SLGS.STAT with DNS/CAN and report DNS/CANCELED", async () => {
      const fam = (value: string) => `0 HEAD
1 GEDC
2 VERS 5.5.1
0 @F1@ FAM
1 SLGS
2 STAT ${value}
0 TRLR
`;
      expect(valueIn(fam("DNS/CAN"), [1, 0, 0])).toEqual([]);
      expect(valueIn(fam("DNS/CANCELED"), [1, 0, 0]).length).toBe(1);
    });

    test("should pass ORDI with yes and report anything else", async () => {
      const subn = (value: string) => `0 HEAD
1 GEDC
2 VERS 5.5.1
0 @S1@ SUBN
1 ORDI ${value}
0 TRLR
`;
      expect(valueIn(subn("yes"), [1, 0])).toEqual([]);
      expect(valueIn(subn("maybe"), [1, 0]).length).toBe(1);
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

    // #239: one spelling of the era passed, and 5.5.1 pins none.
    const dateIn = (date: string) => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 5.5.1
0 @F1@ FAM
1 MARR
2 DATE ${date}
0 TRLR
`);
      const ruleEngine = new RuleNode(g551validation, pointers);
      return ruleEngine.validate(nodes[1].children[0].children[0]);
    };

    test.each([
      "1472 BC",
      "ABT 1472 BC",
      "AFT 1032 BC",
      "1472BC",
      "1472B.C.",
      "1472 B.C",
      "1472 bc",
      "BET 1500 BC AND 1400 BC",
      "1472 B.C.",
      "1472 BCE",
    ])("should pass DATE with %s", async (date) => {
      expect(dateIn(date)).toEqual([]);
    });

    test.each([
      "1472 banana",
      "609 BC Megiddo",
      "abt. 716 BC (or 725)",
      "POSS ABT 1500 BC",
    ])("should return error because DATE %s is free text", async (date) => {
      expect(dateIn(date).length).toBe(1);
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

    test("should not throw for a line carrying a pointer but no tag", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@
1 NAME John /Doe/
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const tagless = nodes[1];
      const NAME = tagless.children[0];
      expect(() => ruleEngine.getNodeType(tagless)).not.toThrow();
      expect(ruleEngine.getNodeType(tagless)).toBe("");
      expect(() => ruleEngine.getNodeType(NAME)).not.toThrow();
      expect(ruleEngine.getNodeType(NAME)).toBe("");
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

describe("payload types the schemes declare", () => {
  const schemes: [string, GedcomScheme][] = [
    ["g7validation.json", g7validationJson],
    ["g551validation.json", g551validation],
  ];

  test.each(schemes)(
    "%s declares no payload type the field type table leaves unnamed",
    async (_name, scheme) => {
      const unnamed = Object.values(scheme.payload)
        .map((payload) => payload.type)
        .filter(
          (type) =>
            type !== null &&
            type !== "pointer" &&
            !(type in PAYLOAD_FIELD_TYPES),
        );
      expect([...new Set(unnamed)].sort()).toEqual([]);
    },
  );

  // A payload type the table does not name is one the schema describes and
  // this file does not. Reading it as a required non-empty string reports a
  // missing value on every structure that legitimately omits it. #112
  test("says nothing about a payload type the table does not name", async () => {
    const unmodelled = GedcomType("https://gedcom.io/terms/v7/UNRELEASED");
    const scheme: GedcomScheme = {
      ...g7validationJson,
      payload: {
        ...g7validationJson.payload,
        [unmodelled]: { type: "https://gedcom.io/terms/v7/type-Unreleased" },
      },
    };
    const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 NAME
0 TRLR
`);
    const node = nodes[1].children[0];
    expect(new RuleNode(scheme, pointers).validate(node, unmodelled)).toEqual(
      [],
    );
  });
});
