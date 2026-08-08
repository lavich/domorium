import { describe, expect, test } from "vitest";
import { GedcomDocument } from "./gedcomDocument";

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

  test("reports a tag declared twice in SCHMA", () => {
    const gedcomDocument = new GedcomDocument().createDocument(`0 HEAD
1 GEDC
2 VERS 7.0
1 SCHMA
2 TAG _X http://example.com/first
2 TAG _X http://example.com/second
0 TRLR
`);

    const codes = gedcomDocument.getErrors().map((error) => error.code);
    expect(codes).toContain("VAL009");
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
});
