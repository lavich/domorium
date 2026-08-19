import { describe, expect, test } from "vitest";
import { GedcomValidator, schemeFor } from "./validate";
import { ConfigurableLexer } from "../parser/lexer";
import { buildAst } from "../parser/ast";
import { collectExtensions } from "./extensions";
import { getGedcomVersion } from "./getGedcomVersion";
import { GedcomErrorCode } from "../types/errors";

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

  // Issue #116: a leaf structure accepted any child, silently, to any depth.
  describe("a structure the schema gives no substructures", () => {
    test("reports a child of it as an unknown tag", async () => {
      const { nodes } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @S1@ SOUR
1 TITL Open Archieven
2 BOGUS whatever
0 TRLR
`);
      const validator = new GedcomValidator();

      const errs = validator.validate(nodes);

      expect(errs).toEqual([
        expect.objectContaining({
          code: GedcomErrorCode.UnknownTag,
          message: "Unknown tag BOGUS in parent TITL",
        }),
      ]);
    });

    // Reported once, at the outermost unknown tag; its subtree is left alone,
    // as under any other parent. ADR-0008 gives the reason for extensions:
    // there is no definition to check a subtree against.
    test("reports the outermost child once and leaves its subtree alone", async () => {
      const { nodes } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @S1@ SOUR
1 TITL Open Archieven
2 BOGUS whatever
3 ALSO nested
0 TRLR
`);
      const validator = new GedcomValidator();

      const errs = validator.validate(nodes);

      expect(errs.map((e) => e.message)).toEqual([
        "Unknown tag BOGUS in parent TITL",
      ]);
    });

    test("reports a child of TRLR in GEDCOM 5.5.1, which is such a structure", async () => {
      const { nodes, pointers } = astBuilder(`0 HEAD
1 GEDC
2 VERS 5.5.1
2 FORM LINEAGE-LINKED
1 CHAR UTF-8
1 SOUR Domorium
1 SUBM @SUBM1@
0 @SUBM1@ SUBM
1 NAME Someone
0 TRLR
1 ANYTHING at all
`);
      const validator = new GedcomValidator(pointers);

      const errs = validator.validate(nodes);

      expect(errs).toEqual([
        expect.objectContaining({
          code: GedcomErrorCode.UnknownTag,
          message: "Unknown tag ANYTHING in parent TRLR",
        }),
      ]);
    });

    test("still accepts the continuation lines its payload allows", async () => {
      const { nodes } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @S1@ SOUR
1 TITL A title long enough to wrap
2 CONT onto a second line
2 CONC and further still
0 TRLR
`);
      const validator = new GedcomValidator();

      const errs = validator.validate(nodes);

      expect(errs).toEqual([]);
    });

    test("says nothing when it has no children", async () => {
      const { nodes } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @S1@ SOUR
1 TITL Open Archieven
0 TRLR
`);
      const validator = new GedcomValidator();

      const errs = validator.validate(nodes);

      expect(errs).toEqual([]);
    });
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
    const { context } = collectExtensions(
      nodes,
      !version?.startsWith("5"),
      schemeFor(nodes),
    );
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

  // Issue #132: the inline form of a multimedia link warned on its own children.
  // GEDCOM 5.5.1 gives OBJE two shapes in a link position — a pointer, or FILE
  // and TITL beneath it — and puts FORM beneath FILE, where 5.5 put it beneath
  // OBJE.
  // The sibling message about a missing tag has said "root" all along.
  test("names the root as the root, not as undefined", async () => {
    const { nodes, validator } = validatorFor(`0 HEAD
1 SOUR TestApp
1 GEDC
2 VERS 5.5.1
2 FORM LINEAGE-LINKED
1 CHAR UTF-8
1 SUBM @U1@
0 @U1@ SUBM
1 NAME Submitter
0 @X1@ FOO
0 TRLR
`);

    const messages = validator.validate(nodes).map((error) => error.message);
    expect(messages).toContain("Unknown tag FOO in parent root");
  });

  // #252: the message named a tag the file does not contain.
  describe("a tag written in mixed case", () => {
    const messagesFor = (line: string) => {
      const { nodes, validator } = validatorFor(`0 HEAD
1 SOUR TestApp
1 GEDC
2 VERS 5.5.1
2 FORM LINEAGE-LINKED
1 CHAR UTF-8
1 SUBM @U1@
0 @U1@ SUBM
1 NAME Submitter
0 @I1@ INDI
${line}
0 TRLR
`);
      return validator.validate(nodes).map((error) => error.message);
    };

    test("names the tag the file wrote", async () => {
      expect(messagesFor("1 NoTe hello").join(" ")).toContain("NoTe");
    });

    test("says a tag is written in upper case when that is the whole of it", async () => {
      expect(messagesFor("1 NoTe hello")).toContainEqual(
        expect.stringContaining("NOTE"),
      );
    });

    test("still says only that a tag is unknown where case is not the problem", async () => {
      const messages = messagesFor("1 NOTEE hello");

      expect(messages.join(" ")).toContain("NOTEE");
      expect(messages.join(" ")).not.toMatch(/upper case/i);
    });
  });

  describe("a 5.5.1 multimedia link", () => {
    const in551 = (body: string) =>
      validatorFor(`0 HEAD
1 SOUR TestApp
1 GEDC
2 VERS 5.5.1
2 FORM LINEAGE-LINKED
1 CHAR UTF-8
1 SUBM @U1@
0 @U1@ SUBM
1 NAME Submitter
${body}0 TRLR
`);

    test("accepts the inline form", async () => {
      const { nodes, validator } = in551(`0 @I1@ INDI
1 OBJE
2 FILE http://example.org/portrait.jpg
3 FORM jpeg
`);

      expect(validator.validate(nodes)).toEqual([]);
    });

    test("accepts MEDI beneath that FORM", async () => {
      const { nodes, validator } = in551(`0 @I1@ INDI
1 OBJE
2 FILE http://example.org/portrait.jpg
3 FORM jpeg
4 MEDI photo
`);

      expect(validator.validate(nodes)).toEqual([]);
    });

    test("accepts a TITL alongside the FILE", async () => {
      const { nodes, validator } = in551(`0 @I1@ INDI
1 OBJE
2 FILE http://example.org/portrait.jpg
3 FORM jpeg
2 TITL A portrait
`);

      expect(validator.validate(nodes)).toEqual([]);
    });

    // FORM is {1:1} beneath FILE in both OBJE shapes.
    test("requires a FORM beneath the FILE", async () => {
      const { nodes, validator } = in551(`0 @I1@ INDI
1 OBJE
2 FILE http://example.org/portrait.jpg
`);

      expect(validator.validate(nodes)).toEqual([
        expect.objectContaining({
          code: GedcomErrorCode.MissingTag,
          message: "Missing required tag FORM in FILE",
        }),
      ]);
    });

    // #243: the position came from the parent of the first child, so a parent
    // with no children at all sent the report to the top of the document.
    test("points at the FILE that lacks the FORM, not at line 1", async () => {
      const document = `0 @I1@ INDI
1 OBJE
2 FILE http://example.org/portrait.jpg
`;
      const { nodes, validator } = in551(document);
      const fileLine = `0 HEAD
1 SOUR TestApp
1 GEDC
2 VERS 5.5.1
2 FORM LINEAGE-LINKED
1 CHAR UTF-8
1 SUBM @U1@
0 @U1@ SUBM
1 NAME Submitter
${document}`
        .split("\n")
        .findIndex((line) => line.startsWith("2 FILE"));

      const [error] = validator.validate(nodes);
      expect(error.range.start.line).toBe(fileLine);
    });

    test("still rejects FORM directly beneath OBJE, which is the 5.5 layout", async () => {
      const { nodes, validator } = in551(`0 @I1@ INDI
1 OBJE
2 FORM URL
`);

      expect(validator.validate(nodes)).toEqual([
        expect.objectContaining({
          code: GedcomErrorCode.UnknownTag,
          message: "Unknown tag FORM in parent OBJE",
        }),
      ]);
    });

    // The two shapes share one type, so FILE cannot be required without the
    // pointer form reporting it absent.
    test("accepts the pointer form with no children", async () => {
      const { nodes, validator } = in551(`0 @I1@ INDI
1 OBJE @M1@
0 @M1@ OBJE
1 FILE portrait.jpg
2 FORM jpeg
`);

      expect(validator.validate(nodes)).toEqual([]);
    });

    test("still requires one shape or the other", async () => {
      const { nodes, validator } = in551(`0 @I1@ INDI
1 OBJE
`);

      expect(validator.validate(nodes)).toEqual([
        expect.objectContaining({ code: GedcomErrorCode.MissingRef }),
      ]);
    });
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

  test("returns every diagnostic of a subtree that has more than 125k of them", async () => {
    const children = 130_000;
    const lines = ["0 HEAD", "1 GEDC", "2 VERS 7.0", "0 @I1@ INDI"];
    for (let i = 1; i <= children; i += 1) {
      lines.push(`1 ZZZ${i} x`);
    }
    lines.push("0 TRLR", "");
    const { nodes, pointers } = astBuilder(lines.join("\n"));

    const errs = new GedcomValidator(pointers).validate(nodes);

    expect(
      errs.filter((error) => error.code === GedcomErrorCode.UnknownTag),
    ).toHaveLength(children);
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
