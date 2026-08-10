import { describe, expect, test } from "vitest";
import { getGedcomVersion } from "./getGedcomVersion";
import { ConfigurableLexer } from "../parser/lexer";
import { buildAst } from "../parser/ast";
import { GedcomDocument } from "../document/gedcomDocument";

const astBuilder = (text: string) => {
  const lexingResult = new ConfigurableLexer({ zeroBased: true }).tokenize(
    text,
  );
  return buildAst(lexingResult.tokens, text);
};

const documentWith = (versLine: string) => `0 HEAD
1 SOUR TestApp
1 GEDC
${versLine}
2 FORM LINEAGE-LINKED
1 CHAR UTF-8
1 SUBM @U1@
0 @U1@ SUBM
1 NAME Submitter
1 _SKYPEID example.person
0 TRLR
`;

describe("getGedcomVersion", () => {
  test("reads the version from HEAD.GEDC.VERS", () => {
    const { nodes } = astBuilder(documentWith("2 VERS 5.5.1"));

    expect(getGedcomVersion(nodes)).toBe("5.5.1");
  });

  // Issue #136: a leading space sent a 5.5.1 document to the GEDCOM 7 schema.
  test("trims the value, which may carry the spaces the lexer preserves", () => {
    const { nodes } = astBuilder(documentWith("2 VERS   5.5.1"));

    expect(getGedcomVersion(nodes)).toBe("5.5.1");
  });

  test("has no version when VERS carries no value", () => {
    const { nodes } = astBuilder(documentWith("2 VERS"));

    expect(getGedcomVersion(nodes)).toBeUndefined();
  });

  test("has no version when there is no GEDC at all", () => {
    const { nodes } = astBuilder("0 HEAD\n0 @I1@ INDI\n0 TRLR\n");

    expect(getGedcomVersion(nodes)).toBeUndefined();
  });

  // An undeclared extension tag is accepted in 5.5.1 and warned about in
  // GEDCOM 7, so it says which schema the document was actually judged by.
  describe("selects the schema the document asked for", () => {
    test("with a single space after VERS", () => {
      const document = new GedcomDocument().createDocument(
        documentWith("2 VERS 5.5.1"),
      );

      expect(document.getVersion()).toBe("5.5.1");
      expect(document.getErrors()).toEqual([]);
    });

    test("with extra spaces after VERS", () => {
      const document = new GedcomDocument().createDocument(
        documentWith("2 VERS   5.5.1"),
      );

      expect(document.getVersion()).toBe("5.5.1");
      expect(document.getErrors()).toEqual([]);
    });
  });
});
