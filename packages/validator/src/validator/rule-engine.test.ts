import { describe, expect, test } from "vitest";
import { RuleEngine } from "./rule-engine";
import { ConfigurableLexer, gedcomLexerDefinition } from "../parser/lexer";
import { GedcomParser } from "../parser/parser";
import { GedcomVisitor } from "../parser/visitor";
import g7validationJson from "../schemes/g7validation.json";
import { GedcomType } from "../schemes/schema-types";

const astBuilder = (text: string) => {
  const gedcomLexer = new ConfigurableLexer({ zeroBased: true });
  const lexingResult = gedcomLexer.tokenize(text);
  const parser = new GedcomParser(gedcomLexerDefinition);
  parser.input = lexingResult.tokens;
  const cst = parser.root();
  const visitor = new GedcomVisitor();
  return visitor.root(cst);
};

describe("VERS 7", () => {
  const ruleEngine = new RuleEngine(g7validationJson);

  describe("rule Y|NULL", () => {
    test("should pass MARR with Y", async () => {
      const { nodes } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @F1@ FAM
1 MARR Y
0 TRLR
`);
      const MARR = nodes[1].children[0];
      const errs = ruleEngine.validate(
        MARR,
        GedcomType("https://gedcom.io/terms/v7/MARR"),
      );
      expect(errs.length).toBe(0);
    });

    test("should pass MARR with children", async () => {
      const { nodes } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @F1@ FAM
1 MARR
2 DATE 1 APR 1911
0 TRLR
`);
      const MARR = nodes[1].children[0];
      const errs = ruleEngine.validate(
        MARR,
        GedcomType("https://gedcom.io/terms/v7/MARR"),
      );
      expect(errs.length).toBe(0);
    });

    test("should pass MARR with children", async () => {
      const { nodes } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @F1@ FAM
1 MARR
2 DATE 1 APR 1911
0 TRLR
`);
      const MARR = nodes[1].children[0];
      const errs = ruleEngine.validate(
        MARR,
        GedcomType("https://gedcom.io/terms/v7/MARR"),
      );
      expect(errs.length).toBe(0);
    });

    test("should return error because value incorrect", async () => {
      const { nodes } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @F1@ FAM
1 MARR incorrect_value
2 DATE 1 APR 1911
0 TRLR
`);
      const MARR = nodes[1].children[0];
      const errs = ruleEngine.validate(
        MARR,
        GedcomType("https://gedcom.io/terms/v7/MARR"),
      );
      expect(errs.length).toBe(1);
      expect(errs[0].range.start.line).toBe(4);
    });
  });

  describe("rule String", () => {
    test("should pass NAME with payload", async () => {
      const { nodes } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 NAME Gomer
0 TRLR
`);
      const NAME = nodes[1].children[0];
      const errs = ruleEngine.validate(
        NAME,
        GedcomType("https://gedcom.io/terms/v7/INDI-NAME"),
      );
      expect(errs.length).toBe(0);
    });

    test("should return error because Name has not payload", async () => {
      const { nodes } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 NAME
0 TRLR
`);
      const NAME = nodes[1].children[0];
      const errs = ruleEngine.validate(
        NAME,
        GedcomType("https://gedcom.io/terms/v7/INDI-NAME"),
      );
      expect(errs.length).toBe(1);
    });
  });

  describe("rule Select", () => {
    test("should pass SEX with payload", async () => {
      const { nodes } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 SEX  M 
0 TRLR
`);
      const SEX = nodes[1].children[0];
      const errs = ruleEngine.validate(
        SEX,
        GedcomType("https://gedcom.io/terms/v7/SEX"),
      );
      expect(errs.length).toBe(0);
    });

    test("should return error because SEX has not correct payload", async () => {
      const { nodes } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @i1@ INDI
1 SEX NON_ENUM_TAG
0 TRLR
`);
      const SEX = nodes[1].children[0];
      const errs = ruleEngine.validate(
        SEX,
        GedcomType("https://gedcom.io/terms/v7/SEX"),
      );
      expect(errs.length).toBe(1);
    });
  });

  describe("rule Multiselect", () => {
    test("should pass RESN with payload", async () => {
      const { nodes } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 RESN LOCKED,  PRIVACY
0 TRLR
`);
      const RESN = nodes[1].children[0];
      const errs = ruleEngine.validate(
        RESN,
        GedcomType("https://gedcom.io/terms/v7/RESN"),
      );
      expect(errs.length).toBe(0);
    });

    test("should return error because RESN has not correct payload", async () => {
      const { nodes } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 RESN non_correct_value
0 TRLR
`);
      const RESN = nodes[1].children[0];
      const errs = ruleEngine.validate(
        RESN,
        GedcomType("https://gedcom.io/terms/v7/RESN"),
      );
      expect(errs.length).toBe(1);
    });
  });
});
