import { describe, expect, it } from "vitest";

import { GedcomLanguageService } from "../../languageService";
import type { EditRefusal, StructureEditResult } from "../../types";
import { applyEdits } from "../position/applyEdits";

const G7 = ["0 HEAD", "1 GEDC", "2 VERS 7.0"];
const G551 = [
  "0 HEAD",
  "1 GEDC",
  "2 VERS 5.5.1",
  "2 FORM LINEAGE-LINKED",
  "1 CHAR UTF-8",
];
const at = (line: number) => ({ line, character: 0 });

function written(
  text: string,
  result: StructureEditResult | EditRefusal,
): string[] {
  if (!result.ok) {
    throw new Error(`refused: ${result.code} ${result.message}`);
  }
  return applyEdits(text, result.edit.edits).split("\n");
}

describe("a file path the dialect cannot carry", () => {
  const object = G7.length;
  const file = object + 1;
  const seven = [
    ...G7,
    "0 @O1@ OBJE",
    "1 FILE media/a.jpg",
    "2 FORM image/jpeg",
    "0 TRLR",
  ].join("\n");

  it("refuses a path that leaves the file's folder, with its facts", () => {
    const service = new GedcomLanguageService(seven);

    expect(service.setValue(at(file), { value: "../x.jpg" }, 0)).toEqual({
      ok: false,
      code: "file-target-unsupported",
      message: expect.any(String),
      diagnosticCode: "VAL020",
      data: { tag: "FILE", pathProblem: "parent-folder" },
    });
  });

  it("writes a path within the file's folder and a URL", () => {
    const service = new GedcomLanguageService(seven);

    expect(
      written(seven, service.setValue(at(file), { value: "media/x.jpg" }, 0))[
        file
      ],
    ).toBe("1 FILE media/x.jpg");
    expect(
      written(
        seven,
        service.setValue(at(file), { value: "https://example.com/x.jpg" }, 0),
      )[file],
    ).toBe("1 FILE https://example.com/x.jpg");
  });

  it("refuses a path with a space before it, as the links read it trimmed", () => {
    const service = new GedcomLanguageService(seven);

    expect(service.setValue(at(file), { value: " ../x.jpg" }, 0)).toMatchObject(
      { ok: false, code: "file-target-unsupported" },
    );
  });

  it("writes an escaped character and refuses it unescaped", () => {
    const service = new GedcomLanguageService(seven);

    expect(
      written(
        seven,
        service.setValue(at(file), { value: "media/a%3Fb.jpg" }, 0),
      )[file],
    ).toBe("1 FILE media/a%3Fb.jpg");
    expect(
      service.setValue(at(file), { value: "media/a?b.jpg" }, 0),
    ).toMatchObject({
      ok: false,
      code: "file-target-unsupported",
      data: { pathProblem: "unescaped-character" },
    });
  });

  it("refuses a file added with a path that leaves the folder or a Windows path", () => {
    const service = new GedcomLanguageService(seven);
    const added = (value: string) =>
      service.addStructure(
        at(object),
        "FILE",
        { value, children: [{ tag: "FORM", value: "image/jpeg" }] },
        0,
      );

    expect(added("../x.jpg")).toMatchObject({
      ok: false,
      code: "file-target-unsupported",
    });
    expect(added("C:\\photos\\x.jpg")).toMatchObject({
      ok: false,
      code: "file-target-unsupported",
      data: { pathProblem: "absolute" },
    });
  });

  it("refuses the path of a translation of the file", () => {
    const service = new GedcomLanguageService(seven);

    expect(
      service.addStructure(
        at(file),
        "TRAN",
        {
          value: "../x.pdf",
          children: [{ tag: "FORM", value: "application/pdf" }],
        },
        0,
      ),
    ).toMatchObject({
      ok: false,
      code: "file-target-unsupported",
      data: { tag: "TRAN" },
    });
  });

  it("refuses the path of a child given to a file being added", () => {
    const service = new GedcomLanguageService(seven);

    expect(
      service.addStructure(
        at(object),
        "FILE",
        {
          value: "media/x.jpg",
          children: [
            { tag: "FORM", value: "image/jpeg" },
            {
              tag: "TRAN",
              value: "../x.pdf",
              children: [{ tag: "FORM", value: "application/pdf" }],
            },
          ],
        },
        0,
      ),
    ).toMatchObject({
      ok: false,
      code: "file-target-unsupported",
      data: { tag: "TRAN" },
    });
  });

  it("answers the same code before the value is written", () => {
    const service = new GedcomLanguageService(seven);

    expect(
      service.validateValue(
        at(file),
        "FILE",
        { value: "../x.jpg" },
        { replacing: true },
      ),
    ).toEqual({
      ok: true,
      problems: [
        expect.objectContaining({
          code: "file-target-unsupported",
          diagnosticCode: "VAL020",
          severity: "error",
        }),
      ],
    });
  });

  it("writes a 5.5.1 path that climbs", () => {
    const text = [
      ...G551,
      "0 @O1@ OBJE",
      "1 FILE media/a.jpg",
      "2 FORM jpg",
      "0 TRLR",
    ].join("\n");
    const line = G551.length + 1;
    const service = new GedcomLanguageService(text);

    expect(
      written(text, service.setValue(at(line), { value: "../x.jpg" }, 0))[line],
    ).toBe("1 FILE ../x.jpg");
  });
});

describe("a 5.5.1 form outside the standard", () => {
  const text = [
    ...G551,
    "0 @O1@ OBJE",
    "1 FILE media/a.jpg",
    "2 FORM jpg",
    "0 TRLR",
  ].join("\n");
  const form = G551.length + 2;

  it("writes a known file extension with a warning beside it", () => {
    const service = new GedcomLanguageService(text);
    const result = service.setValue(at(form), { value: "png" }, 0);

    expect(written(text, result)[form]).toBe("2 FORM png");
    expect(result.ok && result.warnings.map(({ code }) => code)).toEqual([
      "VAL021",
    ]);
  });

  it("writes a form of the standard with no warning", () => {
    const service = new GedcomLanguageService(text);
    const result = service.setValue(at(form), { value: "jpg" }, 0);

    expect(result.ok && result.warnings).toEqual([]);
  });

  it("refuses a misspelt form", () => {
    const service = new GedcomLanguageService(text);

    expect(service.setValue(at(form), { value: "jgp" }, 0)).toMatchObject({
      ok: false,
      code: "value-not-in-enum",
      diagnosticCode: "VAL005",
    });
  });

  it("answers a warning, not a refusal, before the value is written", () => {
    const service = new GedcomLanguageService(text);

    expect(
      service.validateValue(
        at(form),
        "FORM",
        { value: "png" },
        { replacing: true },
      ),
    ).toEqual({
      ok: true,
      problems: [
        expect.objectContaining({
          code: "value-not-in-enum",
          diagnosticCode: "VAL021",
          severity: "warning",
        }),
      ],
    });
  });
});
