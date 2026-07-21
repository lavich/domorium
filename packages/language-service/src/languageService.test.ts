import { describe, expect, it } from "vitest";

import { GedcomLanguageService } from "./languageService";

const GEDCOM = `0 HEAD
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME Homer /Simpson/
1 SEX M
1 FAMS @F1@
0 @I2@ INDI
1 NAME Marge /Bouvier/
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
0 TRLR`;

describe("GedcomLanguageService", () => {
  it("updates and validates one document snapshot", () => {
    const service = new GedcomLanguageService("0 HEAD\n0 TRLR");
    expect(service.getDiagnostics()).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "VAL002" })]),
    );

    service.update("0 HEAD\n1 GEDC\n2 VERS 5.5.1\n0 TRLR");

    expect(service.getDiagnostics()).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: "Missing required tag GEDC in HEAD" }),
      ]),
    );
  });

  it("provides completion from the current line prefix", () => {
    const service = new GedcomLanguageService("0 HEAD\n1 GEDC\n2 ");

    expect(service.getCompletionItems({ line: 2, character: 2 })).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: "VERS" })]),
    );
  });

  it("provides hover and definition ranges", () => {
    const service = new GedcomLanguageService(GEDCOM);

    expect(service.getHover({ line: 4, character: 3 })).toEqual(
      expect.objectContaining({ contents: expect.anything() }),
    );
    expect(service.getDefinitionRanges({ line: 10, character: 9 })).toEqual([
      expect.objectContaining({ start: { line: 3, character: 2 } }),
    ]);
  });

  it("provides semantic, structural, folding, and indentation results", () => {
    const service = new GedcomLanguageService(GEDCOM);

    expect(service.getSemanticTokens()).not.toHaveLength(0);
    expect(service.getDocumentSymbols()).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "INDI" })]),
    );
    expect(service.getFoldingRanges()).toEqual(
      expect.arrayContaining([expect.objectContaining({ startLine: 3 })]),
    );
    expect(service.getInlayHints()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ position: { line: 4, character: 0 } }),
      ]),
    );
  });
});
