import { describe, expect, test } from "vitest";
import { GedcomValidator } from "./validate";
import { ConfigurableLexer, gedcomLexerDefinition } from "../parser/lexer";
import { GedcomParser } from "../parser/parser";
import { GedcomVisitor } from "../parser/visitor";
import { collectExtensions } from "./extensions";
import { getGedcomVersion } from "./getGedcomVersion";

const astBuilder = (text: string) => {
  const gedcomLexer = new ConfigurableLexer({ zeroBased: true });
  const lexingResult = gedcomLexer.tokenize(text);
  const parser = new GedcomParser(gedcomLexerDefinition);
  parser.input = lexingResult.tokens;
  const cst = parser.root();
  const visitor = new GedcomVisitor();
  return visitor.root(cst);
};

describe("validator", () => {
  test("minimum required tags", async () => {
    const { nodes } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 TRLR
`);
    const validator = new GedcomValidator();
    const errs = validator.validate(nodes);
    expect(errs.length).toBe(0);
  });

  test("minimum required INDI", async () => {
    const { nodes } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @i1@ INDI
0 TRLR
`);
    const validator = new GedcomValidator();
    const errs = validator.validate(nodes);
    expect(errs.length).toBe(0);
  });

  test("minimum required FAM", async () => {
    const { nodes } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @f1@ FAM
0 TRLR
`);
    const validator = new GedcomValidator();
    const errs = validator.validate(nodes);
    expect(errs.length).toBe(0);
  });

  test("required enum value", async () => {
    const { nodes } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @i1@ INDI
1 SEX NON_ENUM_TAG
0 TRLR
`);
    const validator = new GedcomValidator();
    const errs = validator.validate(nodes);
    expect(errs.length).toBe(1);
  });

  test("correct enum value", async () => {
    const { nodes } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @i1@ INDI
1 SEX M
0 TRLR
`);
    const validator = new GedcomValidator();
    const errs = validator.validate(nodes);
    expect(errs.length).toBe(0);
  });

  test("should not report CONT/CONC continuation lines as unknown tags", async () => {
    const { nodes } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @i1@ INDI
1 NOTE This is a long note
2 CONC that continues here
2 CONT and continues on a new line.
0 TRLR
`);
    const validator = new GedcomValidator();
    const errs = validator.validate(nodes);
    expect(errs.length).toBe(0);
  });

  test("should return error because WIFE has not pointer", async () => {
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
    const validator = new GedcomValidator(pointers);
    const errs = validator.validate(nodes);
    expect(errs.length).toBe(1);
  });

  const validatorFor = (text: string) => {
    const { nodes, pointers } = astBuilder(text);
    const version = getGedcomVersion(nodes);
    const { context } = collectExtensions(nodes, !version?.startsWith("5"));
    return { nodes, validator: new GedcomValidator(pointers, context) };
  };

  test("accepts an extension tag declared in SCHMA", async () => {
    const { nodes, validator } = validatorFor(`0 HEAD
1 GEDC
2 VERS 7.0
1 SCHMA
2 TAG _SKYPEID http://xmlns.com/foaf/0.1/skypeID
0 @U1@ SUBM
1 NAME Submitter
1 _SKYPEID example.person
0 TRLR
`);

    expect(validator.validate(nodes)).toEqual([]);
  });

  test("warns about an undeclared extension tag in GEDCOM 7", async () => {
    const { nodes, validator } = validatorFor(`0 HEAD
1 GEDC
2 VERS 7.0
0 @U1@ SUBM
1 NAME Submitter
1 _SKYPEID example.person
0 TRLR
`);

    const errs = validator.validate(nodes);

    expect(errs).toHaveLength(1);
    expect(errs[0].code).toBe("VAL008");
    expect(errs[0].level).toBe("warning");
    expect(errs[0].message).toContain("_SKYPEID");
  });

  test("accepts an undeclared extension tag in GEDCOM 5.5.1", async () => {
    const { nodes, validator } = validatorFor(`0 HEAD
1 SOUR TestApp
1 GEDC
2 VERS 5.5.1
2 FORM LINEAGE-LINKED
1 CHAR UTF-8
1 SUBM @U1@
0 @U1@ SUBM
1 NAME Submitter
1 _SKYPEID example.person
0 TRLR
`);

    expect(validator.validate(nodes)).toEqual([]);
  });

  test("does not validate inside an extension subtree", async () => {
    const { nodes, validator } = validatorFor(`0 HEAD
1 GEDC
2 VERS 7.0
1 SCHMA
2 TAG _SKYPEID http://xmlns.com/foaf/0.1/skypeID
0 @U1@ SUBM
1 NAME Submitter
1 _SKYPEID example.person
2 NOT_A_REAL_TAG anything at all
0 TRLR
`);

    expect(validator.validate(nodes)).toEqual([]);
  });

  test("reports an undeclared extension tag once per occurrence", async () => {
    const { nodes, validator } = validatorFor(`0 HEAD
1 GEDC
2 VERS 7.0
0 @U1@ SUBM
1 NAME Submitter
1 _SKYPEID first.person
1 _SKYPEID second.person
0 TRLR
`);

    expect(validator.validate(nodes)).toHaveLength(2);
  });

  // Validation cost must not grow with records × nodes. The quadratic version
  // — a RuleNode per node, each flattening the whole pointer map — needs tens
  // of seconds at this size; a linear one needs tens of milliseconds. The
  // budget is deliberately far from both so a loaded machine cannot flip it.
  test("validates a document with many records without quadratic slowdown", async () => {
    const lines = ["0 HEAD", "1 GEDC", "2 VERS 7.0"];
    for (let i = 1; i <= 8000; i += 1) {
      lines.push(
        `0 @I${i}@ INDI`,
        `1 NAME Person${i} /Family/`,
        "1 SEX M",
        "1 BIRT",
        "2 DATE 2 JAN 1801",
      );
    }
    lines.push("0 TRLR", "");
    const { nodes, pointers } = astBuilder(lines.join("\n"));

    const started = performance.now();
    new GedcomValidator(pointers).validate(nodes);
    const elapsed = performance.now() - started;

    expect(elapsed).toBeLessThan(2000);
  }, 120_000);

  test("accepts an extension record at level 0", async () => {
    const { nodes, validator } = validatorFor(`0 HEAD
1 GEDC
2 VERS 7.0
1 SCHMA
2 TAG _MYREC http://example.com/terms/myrec
0 @X1@ _MYREC
1 NAME whatever
0 TRLR
`);

    expect(validator.validate(nodes)).toEqual([]);
  });
});
