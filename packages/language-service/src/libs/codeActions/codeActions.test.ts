import { describe, expect, it } from "vitest";
import { GedcomLanguageService } from "../../languageService";

const documentText = [
  "0 HEAD",
  "1 GEDC",
  "2 VERS 7.0",
  "0 @I1@ INDI",
  "0 @F1@ FAM",
  "1 WIFE @I9@",
  "0 TRLR",
].join("\n");

describe("code actions", () => {
  it("offers replacement and record creation for an unresolved XREF", () => {
    const service = new GedcomLanguageService(documentText, 3);
    const diagnostic = service
      .getDiagnostics()
      .find(({ code }) => code === "unresolved-xref")!;

    expect(
      service.getCodeActions(diagnostic.range, [diagnostic], 3),
    ).toEqual([
      {
        title: "Replace @I9@ with @I1@",
        kind: "quickfix",
        diagnostics: [diagnostic],
        edit: {
          version: 3,
          edits: [{ range: diagnostic.range, newText: "@I1@" }],
        },
      },
      {
        title: "Create INDI record @I9@",
        kind: "quickfix",
        diagnostics: [diagnostic],
        edit: {
          version: 3,
          edits: [
            {
              range: {
                start: { line: 6, character: 0 },
                end: { line: 6, character: 0 },
              },
              newText: "0 @I9@ INDI\n",
            },
          ],
        },
      },
    ]);
  });

  it("returns choices instead of silently selecting among several records", () => {
    const service = new GedcomLanguageService(
      documentText.replace("0 @F1@ FAM", "0 @I2@ INDI\n0 @F1@ FAM"),
      1,
    );
    const diagnostic = service
      .getDiagnostics()
      .find(({ code }) => code === "unresolved-xref")!;
    const actions = service.getCodeActions(
      diagnostic.range,
      [diagnostic],
      1,
    );

    expect(actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Replace @I9@ with an existing INDI record",
          choices: [
            expect.objectContaining({ title: "Replace with @I1@" }),
            expect.objectContaining({ title: "Replace with @I2@" }),
          ],
        }),
      ]),
    );
  });

  it("offers a one-token correction for an invalid level", () => {
    const service = new GedcomLanguageService(
      [
        "0 HEAD",
        "1 GEDC",
        "2 VERS 7.0",
        "0 @I1@ INDI",
        "2 NAME Homer /Simpson/",
        "0 TRLR",
      ].join("\n"),
      2,
    );
    const diagnostic = service
      .getDiagnostics()
      .find(({ code }) => code === "invalid-level")!;

    expect(
      service.getCodeActions(diagnostic.range, [diagnostic], 2),
    ).toEqual([
      {
        title: "Change level to 1",
        kind: "quickfix",
        diagnostics: [diagnostic],
        edit: {
          version: 2,
          edits: [{ range: diagnostic.range, newText: "1" }],
        },
      },
    ]);
  });

  it("refuses stale edits and ignores diagnostics not in current state", () => {
    const service = new GedcomLanguageService(documentText, 4);
    const diagnostic = service
      .getDiagnostics()
      .find(({ code }) => code === "unresolved-xref")!;

    expect(
      service.getCodeActions(diagnostic.range, [diagnostic], 3),
    ).toMatchObject({ ok: false, code: "stale-document" });
    expect(
      service.getCodeActions(
        diagnostic.range,
        [{ ...diagnostic, message: "foreign diagnostic" }],
        4,
      ),
    ).toEqual([]);
  });

  it("does not create a record whose required payload is unknown", () => {
    const service = new GedcomLanguageService(
      [
        "0 HEAD",
        "1 GEDC",
        "2 VERS 7.0",
        "0 @I1@ INDI",
        "1 OBJE @O9@",
        "0 TRLR",
      ].join("\n"),
      1,
    );
    const diagnostic = service
      .getDiagnostics()
      .find(({ code }) => code === "unresolved-xref")!;

    expect(
      service
        .getCodeActions(diagnostic.range, [diagnostic], 1)
        .some((action) => "title" in action && action.title.startsWith("Create")),
    ).toBe(false);
  });

  it("does not offer a level fix when the moved tag is invalid in schema", () => {
    const service = new GedcomLanguageService(
      [
        "0 HEAD",
        "1 GEDC",
        "2 VERS 7.0",
        "0 @I1@ INDI",
        "2 HUSB @I1@",
        "0 TRLR",
      ].join("\n"),
      1,
    );
    const diagnostic = service
      .getDiagnostics()
      .find(({ code }) => code === "invalid-level")!;

    expect(service.getCodeActions(diagnostic.range, [diagnostic], 1)).toEqual(
      [],
    );
  });

  it("creates bare records only for types valid in the detected version", () => {
    const v7 = new GedcomLanguageService(
      [
        "0 HEAD",
        "1 GEDC",
        "2 VERS 7.0",
        "0 @I1@ INDI",
        "1 SOUR @S9@",
        "0 TRLR",
      ].join("\n"),
      1,
    );
    const v7Diagnostic = v7
      .getDiagnostics()
      .find(({ code }) => code === "unresolved-xref")!;
    expect(
      v7
        .getCodeActions(v7Diagnostic.range, [v7Diagnostic], 1)
        .map((action) => ("title" in action ? action.title : "")),
    ).toContain("Create SOUR record @S9@");

    const v551 = new GedcomLanguageService(
      [
        "0 HEAD",
        "1 GEDC",
        "2 VERS 5.5.1",
        "0 @I1@ INDI",
        "1 NOTE @N9@",
        "0 TRLR",
      ].join("\n"),
      1,
    );
    const v551Diagnostic = v551
      .getDiagnostics()
      .find(({ code }) => code === "unresolved-xref")!;
    expect(
      v551
        .getCodeActions(v551Diagnostic.range, [v551Diagnostic], 1)
        .map((action) => ("title" in action ? action.title : "")),
    ).toContain("Create NOTE record @N9@");
  });

  it("does not use duplicate declarations as replacement candidates", () => {
    const service = new GedcomLanguageService(
      [
        "0 HEAD",
        "1 GEDC",
        "2 VERS 7.0",
        "0 @I1@ INDI",
        "0 @I1@ INDI",
        "0 @F1@ FAM",
        "1 WIFE @I9@",
        "0 TRLR",
      ].join("\n"),
      1,
    );
    const diagnostic = service
      .getDiagnostics()
      .find(({ code }) => code === "unresolved-xref")!;
    const actions = service.getCodeActions(
      diagnostic.range,
      [diagnostic],
      1,
    );
    expect(
      actions.some(
        (action) =>
          "title" in action && action.title.startsWith("Replace @I9@"),
      ),
    ).toBe(false);
  });
});
