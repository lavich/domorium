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
  describe("a caret touching the end of a pointer", () => {
    // Line 4 is `1 FAMS @F1@`: the closing @ is character 10.
    const POINTERS = [
      "0 HEAD",
      "1 GEDC",
      "2 VERS 7.0",
      "0 @I1@ INDI",
      "1 FAMS @F1@",
      "0 @F1@ FAM",
      "0 TRLR",
    ].join("\n");
    const END = { line: 4, character: 11 };

    it("goes to the definition", () => {
      const service = new GedcomLanguageService(POINTERS);

      expect(service.getDefinitionRanges(END)).toHaveLength(1);
    });

    it("finds the references", () => {
      const service = new GedcomLanguageService(POINTERS);

      expect(
        service.getReferences(END, { includeDeclaration: true }),
      ).toHaveLength(2);
    });

    it("offers to rename", () => {
      const service = new GedcomLanguageService(POINTERS);

      expect(service.prepareRename(END).ok).toBe(true);
    });

    it("answers hover at the end of a tag, which reads the same rule", () => {
      const service = new GedcomLanguageService(POINTERS);

      expect(service.getHover({ line: 4, character: 6 })).not.toBeNull();
      expect(service.getHover({ line: 4, character: 7 })).toBeNull();
    });

    it("stops at the space after it, which is nobody's pointer", () => {
      const service = new GedcomLanguageService(
        POINTERS.replace("1 FAMS @F1@", "1 FAMS @F1@ "),
      );

      expect(
        service.getDefinitionRanges({ line: 4, character: 12 }),
      ).toHaveLength(0);
    });
  });

  it("hands out the document it parsed, so a host need not parse it again", () => {
    const service = new GedcomLanguageService(GEDCOM);

    const document = service.getDocument();

    expect(document.getNodes().length).toBeGreaterThan(0);
    expect(document.getVersionResolution()).toEqual(
      service.getVersionResolution(),
    );
  });

  it("reads a date the way it validates one, so 1401 BCE is not AD 1401", () => {
    const service = new GedcomLanguageService(
      [
        "0 HEAD",
        "1 GEDC",
        "2 VERS 7.0",
        "0 @I1@ INDI",
        "1 BIRT",
        "2 DATE 1401 BCE",
        "0 TRLR",
        "",
      ].join("\n"),
    );
    const [, person] = service.getDocumentSymbols();
    const payload = person?.children[0]?.children[0]?.detail ?? "";

    expect(service.getDiagnostics()).toEqual([]);
    expect(service.readDate(payload)).toStrictEqual({
      dates: [{ calendar: "GREGORIAN", year: 1401, epoch: "BCE" }],
      text: "1401 BCE",
    });
  });

  it("reads a year in a file whose header names no version (#453)", () => {
    const service = new GedcomLanguageService(
      "0 HEAD\n0 @I1@ INDI\n1 BIRT\n2 DATE 7 NOV 1867\n0 TRLR\n",
    );

    expect(service.getVersionResolution()?.kind).toBe("undetermined");
    expect(service.readDate("7 NOV 1867")?.dates).toStrictEqual([
      { calendar: "GREGORIAN", day: 7, month: "NOV", year: 1867 },
    ]);
  });

  it("reads a month or a calendar written as a SCHMA alias (#448)", () => {
    const service = new GedcomLanguageService(
      [
        "0 HEAD",
        "1 GEDC",
        "2 VERS 7.0",
        "1 SCHMA",
        "2 TAG _APRX https://gedcom.io/terms/v7/month-APR",
        "2 TAG _JUL https://gedcom.io/terms/v7/cal-JULIAN",
        "0 TRLR",
        "",
      ].join("\n"),
    );

    expect(service.readDate("31 _APRX 2000")).toBeNull();
    expect(service.readDate("_JUL 29 FEB 1900")?.dates).toStrictEqual([
      { calendar: "JULIAN", day: 29, month: "FEB", year: 1900 },
    ]);
  });

  it("reads a year in a Personal Ancestral File", () => {
    const service = new GedcomLanguageService(
      "0 HEAD\n1 SYST PAF\n1 GEDC\n2 VERS 5.5\n0 TRLR\n",
    );

    expect(service.getVersionResolution()?.kind).toBe("paf");
    expect(service.readDate("ABT 1850")?.dates).toStrictEqual([
      { calendar: "GREGORIAN", year: 1850 },
    ]);
  });

  it("hands out the current document, not the one it opened with", () => {
    const service = new GedcomLanguageService(GEDCOM);
    const before = service.getDocument();

    service.update("0 HEAD\n1 GEDC\n2 VERS 7.0\n0 TRLR");

    expect(service.getDocument()).not.toBe(before);
    expect(service.getDocument().getNodes().length).toBeLessThan(
      before.getNodes().length,
    );
  });

  it("updates and validates one document snapshot", () => {
    const service = new GedcomLanguageService("0 HEAD\n0 TRLR");
    expect(service.getDiagnostics()).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "VAL012" })]),
    );

    service.update("0 HEAD\n1 GEDC\n2 VERS 5.5.1\n0 TRLR");

    expect(service.getDiagnostics()).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "VAL012" })]),
    );
    expect(service.getDiagnostics()).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "Missing required tag GEDC in HEAD",
        }),
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

  // The fold gutter asks for every visible line on every view update, so
  // walking the tree per call cost tens of milliseconds per line on a large
  // document. Identity is the exact way to say "computed once".
  it("computes the folding ranges once per parse", () => {
    const service = new GedcomLanguageService(GEDCOM);

    const ranges = service.getFoldingRanges();
    expect(service.getFoldingRanges()).toBe(ranges);

    service.update(GEDCOM + "\n0 @I9@ INDI\n1 SEX F");
    expect(service.getFoldingRanges()).not.toBe(ranges);
  });

  it("answers a fold by start line without scanning the ranges", () => {
    const service = new GedcomLanguageService(GEDCOM);

    for (const range of service.getFoldingRanges()) {
      expect(service.getFoldingRangeAt(range.startLine)).toEqual(
        service
          .getFoldingRanges()
          .find((candidate) => candidate.startLine === range.startLine),
      );
    }
    expect(service.getFoldingRangeAt(-1)).toBeUndefined();
  });
});
