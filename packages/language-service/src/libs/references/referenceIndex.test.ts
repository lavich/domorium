import { describe, expect, it } from "vitest";
import { GedcomLanguageService } from "../../languageService";

describe("ReferenceIndex", () => {
  it("indexes declarations and usages without matching XREF-shaped note text", () => {
    const service = new GedcomLanguageService(
      [
        "0 HEAD",
        "1 GEDC",
        "2 VERS 7.0",
        "0 @I1@ INDI",
        "1 NOTE literal @I2@ text",
        "0 @F1@ FAM",
        "1 HUSB @I1@",
        "1 WIFE @I2@",
        "0 TRLR",
      ].join("\n"),
    );

    expect(service.getReferenceIndex().get("@I1@")).toEqual({
      id: "@I1@",
      declarations: [
        {
          id: "@I1@",
          role: "declaration",
          range: {
            start: { line: 3, character: 2 },
            end: { line: 3, character: 6 },
          },
          recordTag: "INDI",
          fieldTag: "INDI",
        },
      ],
      usages: [
        {
          id: "@I1@",
          role: "usage",
          range: {
            start: { line: 6, character: 7 },
            end: { line: 6, character: 11 },
          },
          recordTag: "FAM",
          fieldTag: "HUSB",
        },
      ],
    });
    expect(service.getReferenceIndex().get("@I2@")?.usages).toHaveLength(1);
  });

  it("retains duplicate declarations as separate occurrences", () => {
    const service = new GedcomLanguageService(
      ["0 @I1@ INDI", "0 @I1@ INDI"].join("\n"),
    );

    expect(
      service.getReferenceIndex().get("@I1@")?.declarations,
    ).toHaveLength(2);
  });

  it("does not index an XREF-shaped value in a non-pointer field", () => {
    const service = new GedcomLanguageService(
      ["0 @I1@ INDI", "1 NOTE @I1@ is prose"].join("\n"),
    );

    expect(service.getReferenceIndex().get("@I1@")?.usages).toEqual([]);
    expect(
      service.getReferences(
        { line: 1, character: 9 },
        { includeDeclaration: true },
      ),
    ).toEqual([]);
  });

  it("does not index a declaration nested below level zero", () => {
    const service = new GedcomLanguageService(
      [
        "0 @F1@ FAM",
        "1 @I1@ INDI",
        "1 HUSB @I1@",
      ].join("\n"),
    );

    expect(service.getReferenceIndex().get("@I1@")?.declarations).toEqual([]);
    expect(
      service.prepareRename({ line: 1, character: 4 }),
    ).toMatchObject({ ok: false, code: "not-xref" });
  });

  it("does not index HEAD or TRLR as XREF record declarations", () => {
    const service = new GedcomLanguageService(
      [
        "0 @H1@ HEAD",
        "1 GEDC",
        "2 VERS 7.0",
        "0 @T1@ TRLR",
      ].join("\n"),
      1,
    );

    expect(service.prepareRename({ line: 0, character: 4 }, 1)).toMatchObject({
      ok: false,
      code: "not-xref",
    });
    expect(service.prepareRename({ line: 3, character: 4 }, 1)).toMatchObject({
      ok: false,
      code: "not-xref",
    });
  });
});
