import { describe, expect, test } from "vitest";
import { GedcomValidator } from "./validate";
import { ConfigurableLexer } from "../parser/lexer";
import { buildAst } from "../parser/ast";
import { collectExtensions } from "./extensions";
import { getGedcomVersion } from "./getGedcomVersion";

const astBuilder = (text: string) => {
  const lexingResult = new ConfigurableLexer({ zeroBased: true }).tokenize(
    text,
  );
  return buildAst(lexingResult.tokens, text);
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

  // Issue #90, from a user's real export: EVEN carries a Text payload, and
  // Text is *anychar, so an omitted payload is valid and the TYPE beneath it
  // is where the meaning lives.
  test("should accept an event with no payload and a TYPE beneath it", async () => {
    const { nodes } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @i1@ INDI
1 EVEN
2 TYPE Emigration
2 DATE
3 PHRASE some time before the war
0 TRLR
`);
    const validator = new GedcomValidator();
    const errs = validator.validate(nodes);
    expect(errs).toEqual([]);
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

  test("reports a tag that exceeds its maximum cardinality", async () => {
    const { nodes, validator } = validatorFor(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 SEX M
1 SEX F
0 TRLR
`);

    const errs = validator.validate(nodes);

    expect(errs).toHaveLength(1);
    expect(errs[0].code).toBe("VAL007");
    expect(errs[0].message).toContain("SEX");
  });

  // The cardinality counters are per parent. A cached rule table must hand each
  // record its own counters, or the second record inherits the first's spent
  // budget and is wrongly reported.
  test("counts cardinality separately for each record", async () => {
    const { nodes, validator } = validatorFor(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 SEX M
0 @I2@ INDI
1 SEX F
0 @I3@ INDI
1 SEX M
0 TRLR
`);

    expect(validator.validate(nodes)).toEqual([]);
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

  // Resolving a pointer used to scan every pointer in the document and build a
  // fresh array of candidates, once per pointer-bearing node — so a file where
  // people are related to each other cost records × pointers. That is the
  // shape of real genealogy data, and the guard above misses it entirely: its
  // records have no cross-references.
  test("validates a document full of cross-references without quadratic slowdown", async () => {
    const families = 4000;
    const lines = ["0 HEAD", "1 GEDC", "2 VERS 7.0"];
    for (let i = 1; i <= families; i += 1) {
      lines.push(
        `0 @I${i * 2 - 1}@ INDI`,
        "1 SEX M",
        `1 FAMS @F${i}@`,
        `0 @I${i * 2}@ INDI`,
        "1 SEX F",
        `1 FAMS @F${i}@`,
      );
    }
    for (let i = 1; i <= families; i += 1) {
      lines.push(
        `0 @F${i}@ FAM`,
        `1 HUSB @I${i * 2 - 1}@`,
        `1 WIFE @I${i * 2}@`,
      );
    }
    lines.push("0 TRLR", "");
    const { nodes, pointers } = astBuilder(lines.join("\n"));

    const started = performance.now();
    const errs = new GedcomValidator(pointers).validate(nodes);
    const elapsed = performance.now() - started;

    expect(errs).toEqual([]);
    expect(elapsed).toBeLessThan(2000);
  }, 300_000);

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
