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

  describe("rule Age", () => {
    test.each(["35y 11m 8w 21d", "9y", "< 1y", "> 25y", "CHILD", "INFANT", "STILLBORN"])(
      "should pass AGE with %s",
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
        expect(errs.length).toBe(0);
      },
    );

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
    test.each(["9 MAR 2007", "1 JAN 1857/58"])(
      "should pass DATE with %s",
      async (date) => {
        const { nodes, pointers } = astBuilder(`0 HEAD
1 DATE ${date}
1 GEDC
2 VERS 7.0
0 TRLR
`);
        const ruleEngine = new RuleNode(g7validationJson, pointers);
        const DATE = nodes[0].children[0];
        const errs = ruleEngine.validate(DATE);
        expect(errs.length).toBe(0);
      },
    );

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

    test("should pass DATE with unrecognized calendar escape without format checking", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 DATE @#DHEBREW@ 1 TISHREI 5761
1 GEDC
2 VERS 7.0
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const DATE = nodes[0].children[0];
      const errs = ruleEngine.validate(DATE);
      expect(errs.length).toBe(0);
    });

    test("should pass DATE with explicit Gregorian calendar escape", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 DATE @#DGREGORIAN@ 9 MAR 2007
1 GEDC
2 VERS 7.0
0 TRLR
`);
      const ruleEngine = new RuleNode(g7validationJson, pointers);
      const DATE = nodes[0].children[0];
      const errs = ruleEngine.validate(DATE);
      expect(errs.length).toBe(0);
    });

    test("should return error because DATE with explicit Gregorian calendar escape is missing day and month", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 DATE @#DGREGORIAN@ 2007
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
    test.each(["image/jpeg", "text/plain", "application/vnd.google-earth.kml+xml"])(
      "should pass FORM with %s",
      async (mediaType) => {
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
      },
    );

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
    test.each(["en", "en-US", "ru-RU", "zh-Hans", "zh-Hans-CN", "sr-Latn-RS", "i-klingon"])(
      "should pass LANG with %s",
      async (lang) => {
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
      },
    );

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
