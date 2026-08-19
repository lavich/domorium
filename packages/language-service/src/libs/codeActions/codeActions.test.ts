import { describe, expect, it } from "vitest";
import { GedcomLanguageService } from "../../languageService";
import { getCodeActions } from "./codeActions";

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
  // Issue #249: the author wrote @I9@, so the record they mean to have comes
  // before any correction of it, and discarding the identifier comes last.
  it("offers creation, then a plausible replacement, then the empty pointer", () => {
    const service = new GedcomLanguageService(documentText, 3);
    const diagnostic = service
      .getDiagnostics()
      .find(({ code }) => code === "unresolved-xref")!;

    expect(service.getCodeActions(diagnostic.range, [diagnostic], 3)).toEqual([
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
      {
        title: "Replace with @I1@",
        kind: "quickfix",
        diagnostics: [diagnostic],
        edit: {
          version: 3,
          edits: [{ range: diagnostic.range, newText: "@I1@" }],
        },
      },
      {
        title: "Point at nothing (@VOID@)",
        kind: "quickfix",
        diagnostics: [diagnostic],
        edit: {
          version: 3,
          edits: [{ range: diagnostic.range, newText: "@VOID@" }],
        },
      },
    ]);
  });

  // A wrong quick fix attaches a person to a stranger, the document validates
  // clean, and nothing points at it again — so a tie offers nothing. See #249.
  it("offers no replacement between two records equally near the xref", () => {
    const service = new GedcomLanguageService(
      documentText.replace("0 @F1@ FAM", "0 @I2@ INDI\n0 @F1@ FAM"),
      1,
    );
    const diagnostic = service
      .getDiagnostics()
      .find(({ code }) => code === "unresolved-xref")!;

    const actions = service.getCodeActions(diagnostic.range, [diagnostic], 1);

    expect(
      actions.map((action) => ("title" in action ? action.title : "")),
    ).toEqual(["Create INDI record @I9@", "Point at nothing (@VOID@)"]);
  });

  // A document-sized list of xrefs is not a quick fix. Completion inside @…@
  // offers them, filtered as the reader types.
  it("offers no replacement in a document full of candidates, none of them near", () => {
    const lines = ["0 HEAD", "1 GEDC", "2 VERS 7.0"];
    for (let index = 1; index <= 40; index += 1) {
      lines.push(`0 @I${index}@ INDI`);
    }
    lines.push("0 @F1@ FAM", "1 WIFE @I999@", "0 TRLR");
    const service = new GedcomLanguageService(lines.join("\n"), 1);
    const diagnostic = service
      .getDiagnostics()
      .find(({ code }) => code === "unresolved-xref")!;

    const actions = service.getCodeActions(diagnostic.range, [diagnostic], 1);

    expect(
      actions.filter(
        (action) => "title" in action && action.title.startsWith("Replace"),
      ),
    ).toEqual([]);
    expect(actions.some((action) => "choices" in action)).toBe(false);
  });

  // Issue #249: "Replace with @F285@" gave a reader nothing to choose on. A
  // family carries no name of its own, so it is named by its spouses.
  it("names the family it offers", () => {
    const service = new GedcomLanguageService(
      [
        "0 HEAD",
        "1 GEDC",
        "2 VERS 7.0",
        "0 @I1@ INDI",
        "1 NAME Gascoigne",
        "0 @I2@ INDI",
        "1 NAME Wardle",
        "0 @F285@ FAM",
        "1 HUSB @I1@",
        "1 WIFE @I2@",
        "0 @I3@ INDI",
        "1 FAMC @F2850@",
        "0 TRLR",
      ].join("\n"),
      1,
    );
    const diagnostic = service
      .getDiagnostics()
      .find(({ code }) => code === "unresolved-xref")!;

    const actions = service.getCodeActions(diagnostic.range, [diagnostic], 1);

    expect(
      actions.map((action) => ("title" in action ? action.title : "")),
    ).toContain("Replace with @F285@ — Gascoigne / Wardle");
  });

  it("offers the xref alone where the record carries nothing to name it by", () => {
    const service = new GedcomLanguageService(
      [
        "0 HEAD",
        "1 GEDC",
        "2 VERS 7.0",
        "0 @F285@ FAM",
        "0 @I3@ INDI",
        "1 FAMC @F2850@",
        "0 TRLR",
      ].join("\n"),
      1,
    );
    const diagnostic = service
      .getDiagnostics()
      .find(({ code }) => code === "unresolved-xref")!;

    const actions = service.getCodeActions(diagnostic.range, [diagnostic], 1);

    expect(
      actions.map((action) => ("title" in action ? action.title : "")),
    ).toContain("Replace with @F285@");
  });

  // 5.5.1 has no @VOID@, so offering it would produce a document that fails to
  // validate on the next keystroke.
  it("offers the empty pointer in GEDCOM 7 and not in 5.5.1", () => {
    const titles = (version: string) => {
      const service = new GedcomLanguageService(
        [
          "0 HEAD",
          "1 GEDC",
          `2 VERS ${version}`,
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
      return service
        .getCodeActions(diagnostic.range, [diagnostic], 1)
        .map((action) => ("title" in action ? action.title : ""));
    };

    expect(titles("7.0")).toContain("Point at nothing (@VOID@)");
    expect(titles("5.5.1")).not.toContain("Point at nothing (@VOID@)");
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

    expect(service.getCodeActions(diagnostic.range, [diagnostic], 2)).toEqual([
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
        .some(
          (action) => "title" in action && action.title.startsWith("Create"),
        ),
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

  it("creates bare records only when the inserted record revalidates", () => {
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
    const createSource = v7
      .getCodeActions(v7Diagnostic.range, [v7Diagnostic], 1)
      .find(
        (action) =>
          "title" in action && action.title === "Create SOUR record @S9@",
      )!;
    const sourceEdit =
      "edit" in createSource ? createSource.edit.edits[0] : null;
    expect(sourceEdit).not.toBeNull();
    const v7Text = [
      "0 HEAD",
      "1 GEDC",
      "2 VERS 7.0",
      "0 @I1@ INDI",
      "1 SOUR @S9@",
      sourceEdit!.newText.trimEnd(),
      "0 TRLR",
    ].join("\n");
    expect(
      new GedcomLanguageService(v7Text, 2)
        .getDiagnostics()
        .filter(({ code }) => code !== "unresolved-xref"),
    ).toEqual([]);

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
    ).not.toContain("Create NOTE record @N9@");
  });

  it("uses only the HEAD.GEDC.VERS value when selecting templates", () => {
    const service = new GedcomLanguageService(
      [
        "0 HEAD",
        "1 GEDC",
        "2 VERS 7.0",
        "0 @I1@ INDI",
        "1 EVEN",
        "2 VERS 5.5.1",
        "1 SOUR @S9@",
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
        .map((action) => ("title" in action ? action.title : "")),
    ).toContain("Create SOUR record @S9@");
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
    const actions = service.getCodeActions(diagnostic.range, [diagnostic], 1);
    expect(
      actions.some(
        (action) => "title" in action && action.title.startsWith("Replace"),
      ),
    ).toBe(false);
  });

  // Names #143: an unsupported version fell through to the GEDCOM 7 record
  // set. Reached directly, since no unresolved reference is reported for one.
  // #251: the file's terminator is the file's.
  it.each([
    ["CR", "\r"],
    ["CR-LF", "\r\n"],
    ["LF-CR", "\n\r"],
    ["LF", "\n"],
  ])("creates a record with the terminator the file uses: %s", (_name, eol) => {
    const text = [
      "0 HEAD",
      "1 GEDC",
      "2 VERS 7.0",
      "0 @F1@ FAM",
      "1 WIFE @I9@",
      "0 TRLR",
    ].join(eol);
    const service = new GedcomLanguageService(text, 1);
    const diagnostic = service
      .getDiagnostics()
      .find(({ code }) => code === "unresolved-xref")!;
    const create = service
      .getCodeActions(diagnostic.range, [diagnostic], 1)
      .find(
        (action) =>
          "title" in action && action.title === "Create INDI record @I9@",
      )!;

    const inserted = "edit" in create ? create.edit.edits[0].newText : "";
    expect(inserted).toBe(`0 @I9@ INDI${eol}`);
  });

  it("creates no record for a version with no dialect", () => {
    const text = [
      "0 HEAD",
      "1 GEDC",
      "2 VERS 7.0",
      "0 @I1@ INDI",
      "0 @F1@ FAM",
      "1 WIFE @I9@",
      "0 TRLR",
    ].join("\n");
    const service = new GedcomLanguageService(text, 1);
    const diagnostic = service
      .getDiagnostics()
      .find(({ code }) => code === "unresolved-xref")!;

    const actions = getCodeActions(
      {
        text,
        index: service.getReferenceIndex(),
        currentDiagnostics: service.getDiagnostics(),
        version: 1,
        dialect: undefined,
        nodes: service.getDocument().getNodes(),
      },
      diagnostic.range,
      [diagnostic],
      1,
    );

    expect(
      Array.isArray(actions)
        ? actions.map((action) => ("title" in action ? action.title : ""))
        : actions,
    ).toEqual(["Replace with @I1@"]);
  });
});
