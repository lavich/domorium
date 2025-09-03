import { describe, expect, test } from "vitest";
import { RuleNode } from "./rule-node";
import { ConfigurableLexer, gedcomLexerDefinition } from "../parser/lexer";
import { GedcomParser } from "../parser/parser";
import { GedcomVisitor } from "../parser/visitor";
import g7validationJson from "../schemes/g7validation.json";
import g551validation from "../schemes/g551validation.json";

const astBuilder = (text: string) => {
  const gedcomLexer = new ConfigurableLexer({ zeroBased: true });
  const lexingResult = gedcomLexer.tokenize(text);
  const parser = new GedcomParser(gedcomLexerDefinition);
  parser.input = lexingResult.tokens;
  const cst = parser.root();
  const visitor = new GedcomVisitor();
  return visitor.root(cst);
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
});
