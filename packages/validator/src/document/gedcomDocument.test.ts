import { describe, expect, test } from "vitest";
import { GedcomDocument } from "./gedcomDocument";
import { GedcomErrorCode } from "../types/errors";

describe("validator", () => {
  test("accepts a partial line while an editor is initializing", () => {
    const gedcomDocument = new GedcomDocument();

    gedcomDocument.createDocument(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1`);

    expect(gedcomDocument.getNodes()).toHaveLength(2);
  });

  test("minimal valid test", async () => {
    const gedcomDocument = new GedcomDocument();
    gedcomDocument.createDocument(`0 HEAD
1 GEDC
2 VERS 7.0
0 TRLR
`);
    const nodes = gedcomDocument.getNodes();
    expect(nodes.length).toBe(2);
    expect(gedcomDocument.pointers.size).toBe(0);
    expect(gedcomDocument.xRefs.size).toBe(0);
  });

  test("minimal valid test pointers", async () => {
    const gedcomDocument = new GedcomDocument();
    gedcomDocument.createDocument(`0 HEAD
1 GEDC
2 VERS 7.0
0 @indi1@ INDI
0 @fam1@ FAM
1 WIFE @indi1@
0 TRLR
`);
    const nodes = gedcomDocument.getNodes();
    expect(nodes.length).toBe(4);
    expect(gedcomDocument.pointers.size).toBe(2);
    expect(gedcomDocument.xRefs.size).toBe(1);
  });

  test("reports structured metadata for an unresolved pointer", () => {
    const gedcomDocument = new GedcomDocument().createDocument(`0 HEAD
1 GEDC
2 VERS 7.0
0 @F1@ FAM
1 WIFE @I9@
0 TRLR
`);

    expect(gedcomDocument.getErrors()).toContainEqual(
      expect.objectContaining({
        code: "unresolved-xref",
        data: { xref: "@I9@", requiredRecordTag: "INDI" },
        range: {
          start: { line: 4, character: 7 },
          end: { line: 4, character: 11 },
        },
      }),
    );
  });

  test("reports the expected level when a line skips a hierarchy level", () => {
    const gedcomDocument = new GedcomDocument().createDocument(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
2 NAME Homer /Simpson/
0 TRLR
`);

    expect(gedcomDocument.getErrors()).toContainEqual(
      expect.objectContaining({
        code: "invalid-level",
        data: { expectedLevel: 1 },
        range: {
          start: { line: 4, character: 0 },
          end: { line: 4, character: 1 },
        },
      }),
    );
  });

  test("labels a declared extension tag with its URI", () => {
    const gedcomDocument = new GedcomDocument().createDocument(`0 HEAD
1 GEDC
2 VERS 7.0
1 SCHMA
2 TAG _SKYPEID http://xmlns.com/foaf/0.1/skypeID
0 @U1@ SUBM
1 NAME Submitter
1 _SKYPEID example.person
0 TRLR
`);

    const subm = gedcomDocument
      .getNodes()
      .find((node) => node.tokens.TAG?.value === "SUBM");
    const skype = subm?.children.find(
      (node) => node.tokens.TAG?.value === "_SKYPEID",
    );

    expect(gedcomDocument.getLabel(skype!)).toBe(
      "Extension tag (http://xmlns.com/foaf/0.1/skypeID)",
    );
  });

  test("labels an undeclared extension tag without a URI", () => {
    const gedcomDocument = new GedcomDocument().createDocument(`0 HEAD
1 GEDC
2 VERS 7.0
0 @U1@ SUBM
1 NAME Submitter
1 _SKYPEID example.person
0 TRLR
`);

    const subm = gedcomDocument
      .getNodes()
      .find((node) => node.tokens.TAG?.value === "SUBM");
    const skype = subm?.children.find(
      (node) => node.tokens.TAG?.value === "_SKYPEID",
    );

    expect(gedcomDocument.getLabel(skype!)).toBe("Extension tag");
  });

  test("labels nothing under a line carrying a pointer but no tag", () => {
    const gedcomDocument = new GedcomDocument().createDocument(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@
1 NAME John /Doe/
0 TRLR
`);

    const tagless = gedcomDocument.getNodes().find((node) => !node.tokens.TAG);
    const name = tagless?.children.find(
      (node) => node.tokens.TAG?.value === "NAME",
    );

    expect(() => gedcomDocument.getLabel(name!)).not.toThrow();
    expect(gedcomDocument.getLabel(name!)).toBeUndefined();
  });

  test("reports a tag declared twice in SCHMA with the same URI", () => {
    const gedcomDocument = new GedcomDocument().createDocument(`0 HEAD
1 GEDC
2 VERS 7.0
1 SCHMA
2 TAG _X http://example.com/first
2 TAG _X http://example.com/first
0 TRLR
`);

    const codes = gedcomDocument.getErrors().map((error) => error.code);
    expect(codes).toContain("VAL009");
  });

  test("says nothing about a tag declared twice with different URIs", () => {
    const gedcomDocument = new GedcomDocument().createDocument(`0 HEAD
1 GEDC
2 VERS 7.0
1 SCHMA
2 TAG _X http://example.com/first
2 TAG _X http://example.com/second
0 TRLR
`);

    const codes = gedcomDocument.getErrors().map((error) => error.code);
    expect(codes).not.toContain("VAL009");
  });

  // Every payload problem used to ship as the bare code "VAL", so a consumer
  // could not tell a missing value from a malformed one.
  // #234: the offset of a character, and then a tag that is not in the file.
  describe("a line the lexer cannot read", () => {
    const errorsFor = (line: string) =>
      new GedcomDocument()
        .createDocument(`0 HEAD\n1 GEDC\n2 VERS 5.5.1\n${line}\n0 TRLR\n`)
        .getErrors()
        .filter((error) => error.range.start.line === 3);

    test("says what is wrong in its own words", () => {
      const [error, ...rest] = errorsFor("0 @NoTe ref@ NOTE mixed case");

      expect(rest).toEqual([]);
      expect(error.code).toBe(GedcomErrorCode.Lexer);
      expect(error.message).not.toMatch(/offset|skipped/);
      expect(error.message).toMatch(/xref/i);
    });

    test("does not go on to read a tag out of the wreckage", () => {
      const messages = errorsFor("0 @NoTe ref@ NOTE mixed case").map(
        (error) => error.message,
      );

      expect(messages.join(" ")).not.toMatch(/Unknown tag/);
    });

    test("leaves the lines around it alone", () => {
      const document = new GedcomDocument();
      document.createDocument(`0 HEAD
1 GEDC
2 VERS 5.5.1
0 @NoTe ref@ NOTE mixed case
0 @I1@ INDI
1 NAME Ada /Lovelace/
0 TRLR
`);

      expect(
        document.getErrors().filter((error) => error.range.start.line > 3),
      ).toEqual([]);
    });
  });

  // #251: a CR-only file collapsed into one node and its version was never found.
  describe("every line terminator 5.5.1 allows", () => {
    const documentWith = (eol: string) => {
      const text = ["0 HEAD", "1 GEDC", "2 VERS 5.5.1", "0 TRLR", ""].join(eol);
      const document = new GedcomDocument();
      document.createDocument(text);
      return document;
    };

    test.each([
      ["LF", "\n"],
      ["CR-LF", "\r\n"],
      ["CR", "\r"],
      ["LF-CR", "\n\r"],
    ])("reads the records of a file ended with %s", (_name, eol) => {
      const document = documentWith(eol);

      expect(document.getNodes()).toHaveLength(2);
      expect(
        document
          .getErrors()
          .filter((error) => error.code === GedcomErrorCode.Lexer),
      ).toEqual([]);
    });

    test.each([
      ["CR", "\r"],
      ["LF-CR", "\n\r"],
    ])("finds the version in a file ended with %s", (_name, eol) => {
      expect(
        documentWith(eol)
          .getErrors()
          .map((error) => error.code),
      ).not.toContain(GedcomErrorCode.UndeterminedVersion);
    });
  });

  // #252: said twice, once by the parser and once about a tag.
  test("says only that a line carries no level", () => {
    const errors = new GedcomDocument()
      .createDocument(
        `0 HEAD
1 GEDC
2 VERS 5.5.1
hello world
0 TRLR
`,
      )
      .getErrors()
      .filter((error) => error.range.start.line === 3);

    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe(GedcomErrorCode.Parser);
  });

  describe("diagnostic codes", () => {
    const codeFor = (body: string) =>
      new GedcomDocument()
        .createDocument(`0 HEAD\n1 GEDC\n2 VERS 7.0\n${body}0 TRLR\n`)
        .getErrors()
        .map((error) => error.code);

    test.each([
      ["0 @I1@ INDI\n1 NAME\n", GedcomErrorCode.MissingValue],
      ["0 @I1@ INDI\n1 SEX NOPE\n", GedcomErrorCode.ShouldBeSetValue],
      [
        "0 @I1@ INDI\n1 BIRT\n2 DATE nonsense\n",
        GedcomErrorCode.IncorrectValue,
      ],
      ["0 @I1@ INDI\n1 SUBM not a pointer\n", GedcomErrorCode.MissingRef],
      ["0 @I1@ INDI\n1 DEAT\n", GedcomErrorCode.EmptyEvent],
      ["0 @I1@ INDI\n1 BOGUS x\n", GedcomErrorCode.UnknownTag],
    ])("reports %s as %s", async (body, code) => {
      expect(codeFor(body)).toContain(code);
    });
  });

  // Written for #94.
  describe("SCHMA aliases", () => {
    const HEAD = `0 HEAD
1 GEDC
2 VERS 7.0
1 SCHMA
2 TAG _USER https://gedcom.io/terms/v7/record-SUBM
2 TAG _CREATOR https://gedcom.io/terms/v7/SUBM
2 TAG _PHRASE https://gedcom.io/terms/v7/PHRASE
2 TAG _CALENDRIER https://gedcom.io/terms/v7/cal-FRENCH_R
2 TAG _JOUR https://gedcom.io/terms/v7/month-COMP
2 TAG _OPAQUE http://example.com/whatever
`;
    const errorsFor = (body: string) =>
      new GedcomDocument().createDocument(`${HEAD}${body}0 TRLR\n`).getErrors();

    test("resolves a pointer to a record written under an alias", () => {
      expect(
        errorsFor(`0 @U1@ _USER
1 NAME Aliased record
0 @I1@ INDI
1 SUBM @U1@
`),
      ).toEqual([]);
    });

    test("validates the subtree of an aliased record as the standard one", () => {
      const errors = errorsFor(`0 @U1@ _USER
`);
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe("VAL002");
      expect(errors[0].message).toContain("NAME");
    });

    test("validates the payload of an aliased substructure", () => {
      const errors = errorsFor(`0 @U1@ _USER
1 NAME Aliased record
0 @I1@ INDI
1 _CREATOR not a pointer
`);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain("should be a pointer");
    });

    test("accepts an aliased structure where the standard tag is not allowed", () => {
      expect(
        errorsFor(`0 @I1@ INDI
1 _PHRASE relocated here
`),
      ).toEqual([]);
    });

    test("reads a date in a calendar named by an alias", () => {
      expect(
        errorsFor(`0 @I1@ INDI
1 BIRT
2 DATE _CALENDRIER 4 COMP 8
`),
      ).toEqual([]);
    });

    test("reads a month named by an alias in a standard calendar", () => {
      expect(
        errorsFor(`0 @I1@ INDI
1 BIRT
2 DATE FRENCH_R 2 _JOUR 8
`),
      ).toEqual([]);
    });

    // BOGUS would be an unknown tag under any standard type, so a clean run
    // is what proves the subtree was left alone.
    test("leaves an extension whose URI is not a standard one opaque", () => {
      expect(
        errorsFor(`0 @I1@ INDI
1 _OPAQUE whatever it likes
2 BOGUS nested
`),
      ).toEqual([]);
    });
  });

  test("accepts a declared extension tag used as an enumeration value", () => {
    const gedcomDocument = new GedcomDocument().createDocument(`0 HEAD
1 GEDC
2 VERS 7.0
1 SCHMA
2 TAG _ENUMVAL http://example.com/enumeration-value
0 @I1@ INDI
1 FAMC @VOID@
2 PEDI _ENUMVAL
0 TRLR
`);

    expect(gedcomDocument.getErrors()).toEqual([]);
  });

  test("reports an undeclared extension tag used as an enumeration value", () => {
    const gedcomDocument = new GedcomDocument().createDocument(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 FAMC @VOID@
2 PEDI _ENUM2
0 TRLR
`);

    const errors = gedcomDocument.getErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("VAL008");
    expect(errors[0].level).toBe("warning");
  });

  // ADR-0009: a file whose version names no schema we hold must not come back
  // clean, and must not be judged by a schema it never asked for.
  describe("version resolution", () => {
    const in551 = (vers: string) => `0 HEAD
1 SOUR TestApp
1 GEDC
2 VERS ${vers}
2 FORM LINEAGE-LINKED
1 CHAR UTF-8
1 SUBM @U1@
0 @U1@ SUBM
1 NAME Submitter
0 TRLR
`;

    test("an unsupported version is reported and stops schema validation", () => {
      const errors = new GedcomDocument()
        .createDocument(
          `0 HEAD\n1 GEDC\n2 VERS 4.0\n0 @I1@ INDI\n1 BOGUS x\n0 TRLR\n`,
        )
        .getErrors();

      expect(errors).toEqual([
        expect.objectContaining({
          code: GedcomErrorCode.UnsupportedVersion,
          level: "error",
        }),
      ]);
    });

    test("an undetermined version is reported under its own code", () => {
      const errors = new GedcomDocument()
        .createDocument(`0 HEAD\n1 GEDC\n0 @I1@ INDI\n0 TRLR\n`)
        .getErrors();

      expect(errors).toEqual([
        expect.objectContaining({
          code: GedcomErrorCode.UndeterminedVersion,
          level: "error",
        }),
      ]);
    });

    test("a substituted version warns and still validates", () => {
      const errors = new GedcomDocument()
        .createDocument(in551("5.5"))
        .getErrors();

      expect(errors).toEqual([
        expect.objectContaining({
          code: GedcomErrorCode.SubstitutedVersion,
          level: "warning",
        }),
      ]);
    });

    test("a supported version reports nothing of its own", () => {
      expect(
        new GedcomDocument().createDocument(in551("5.5.1")).getErrors(),
      ).toEqual([]);
    });

    test("level diagnostics survive an unsupported version", () => {
      const errors = new GedcomDocument()
        .createDocument(
          `0 HEAD\n1 GEDC\n2 VERS 4.0\n0 @I1@ INDI\n3 NAME X /Y/\n0 TRLR\n`,
        )
        .getErrors()
        .map((error) => error.code);

      expect(errors).toContain(GedcomErrorCode.InvalidLevel);
      expect(errors).toContain(GedcomErrorCode.UnsupportedVersion);
    });

    test("the outcome is available without parsing the message", () => {
      const document = new GedcomDocument().createDocument(in551("5.5"));

      expect(document.getVersionResolution()).toMatchObject({
        kind: "substituted",
        version: "5.5",
        dialect: "5.5.1",
      });
    });
  });

  test("reports every diagnostic of a document that has more than 125k of them", () => {
    const records = 130_000;
    const lines = ["0 HEAD", "1 GEDC", "2 VERS 7.0"];
    for (let i = 1; i <= records; i += 1) {
      lines.push(`0 @I${i}@ INDI`, "1 ZZZ x");
    }
    lines.push("0 TRLR", "");

    const errors = new GedcomDocument()
      .createDocument(lines.join("\n"))
      .getErrors();

    expect(
      errors.filter((error) => error.code === GedcomErrorCode.UnknownTag),
    ).toHaveLength(records);
  }, 120_000);
});
