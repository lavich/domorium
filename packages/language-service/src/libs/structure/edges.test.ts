import { describe, expect, it } from "vitest";

import { GedcomLanguageService } from "../../languageService";
import type { StructureDescription } from "../../types";
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

function described(service: GedcomLanguageService, line: number) {
  const result = service.describeStructure(at(line));
  if ("ok" in result) {
    throw new Error(result.code);
  }
  return result as StructureDescription;
}

describe.each([
  ["7.0", G7],
  ["5.5.1", G551],
] as const)("a line break in %s", (_dialect, header) => {
  const base = header.length;
  const text = [
    ...header,
    "0 @I1@ INDI",
    "1 BIRT",
    "2 DATE 1 JAN 1900",
    "0 TRLR",
  ].join("\n");

  it("is refused in a date by setValue and validateValue, apart from a malformed date", () => {
    const service = new GedcomLanguageService(text);

    expect(service.setValue(at(base + 2), { value: "soon" }, 0)).toMatchObject({
      ok: false,
      code: "payload-datatype",
    });
    expect(
      service.setValue(at(base + 2), { value: "1 JAN\n1900" }, 0),
    ).toMatchObject({
      ok: false,
      code: "value-spans-lines",
      diagnosticCode: "VAL017",
    });
    expect(
      service.validateValue(
        at(base + 2),
        "DATE",
        { value: "1 JAN\n1900" },
        { replacing: true },
      ),
    ).toMatchObject({ ok: true, problems: [{ code: "value-spans-lines" }] });
  });

  it("is refused in a child given to addStructure", () => {
    const service = new GedcomLanguageService(text);

    expect(
      service.addStructure(
        at(base),
        "DEAT",
        { value: "Y", children: [{ tag: "DATE", value: "2 FEB\n1950" }] },
        0,
      ),
    ).toMatchObject({ ok: false, code: "value-spans-lines" });
  });

  it("is written as CONT in a note", () => {
    const service = new GedcomLanguageService(text);

    const result = service.addStructure(
      at(base + 1),
      "NOTE",
      { value: "one\ntwo" },
      0,
    );
    if (!result.ok) {
      throw new Error(result.code);
    }

    expect(applyEdits(text, result.edit.edits)).toContain(
      "2 NOTE one\n3 CONT two",
    );
  });

  it("is described per field", () => {
    const service = new GedcomLanguageService(text);
    const birth = described(service, base + 1);

    expect(birth.fields.find((field) => field.tag === "DATE")).toMatchObject({
      lineBreaks: false,
      prose: false,
    });
    expect(birth.fields.find((field) => field.tag === "NOTE")).toMatchObject({
      lineBreaks: true,
      prose: true,
    });
  });
});

describe("an emptied part of a 7.0 name", () => {
  const base = G7.length;

  function emptied(lines: string[], line: number): string[] {
    const text = [...G7, ...lines, "0 TRLR"].join("\n");
    const result = new GedcomLanguageService(text).setValue(
      at(line),
      { value: "" },
      0,
    );
    if (!result.ok) {
      throw new Error(result.code);
    }
    return applyEdits(text, result.edit.edits).split("\n").slice(base);
  }

  it("takes the given name out and leaves the surname between slashes", () => {
    expect(
      emptied(
        ["0 @I1@ INDI", "1 NAME Maria /Curie/", "2 GIVN Maria"],
        base + 2,
      ).slice(1, 3),
    ).toEqual(["1 NAME /Curie/", "2 GIVN"]);
  });

  it("takes the surname out with its slashes", () => {
    expect(
      emptied(
        ["0 @I1@ INDI", "1 NAME Maria /Curie/", "2 SURN Curie"],
        base + 2,
      ).slice(1, 3),
    ).toEqual(["1 NAME Maria", "2 SURN"]);
  });

  it("keeps a prefix when the given name is emptied", () => {
    expect(
      emptied(
        ["0 @I1@ INDI", "1 NAME Dr. Maria /Curie/", "2 GIVN Maria"],
        base + 2,
      )[1],
    ).toBe("1 NAME Dr. /Curie/");
  });
});

describe("an extension line", () => {
  const base = G7.length;
  const text = [
    ...G7,
    "0 @I1@ INDI",
    "1 _MILITARY Cavalry",
    "2 DATE 1914",
    "2 _RANK Cornet",
    "0 TRLR",
  ].join("\n");

  it("is described as an extension with no known fields", () => {
    const description = described(new GedcomLanguageService(text), base + 1);

    expect(description).toMatchObject({
      id: "INDI._MILITARY",
      extension: true,
      value: "Cavalry",
      fields: [],
      payload: { kind: "text" },
    });
    expect(description.undefinedOccurrences.map((entry) => entry.tag)).toEqual([
      "DATE",
      "_RANK",
    ]);
  });

  it("describes a line beneath it as an extension too", () => {
    expect(described(new GedcomLanguageService(text), base + 2)).toMatchObject({
      id: "INDI._MILITARY.DATE",
      extension: true,
    });
  });

  it("is still set and removed as before", () => {
    const service = new GedcomLanguageService(text);

    expect(
      service.setValue(at(base + 1), { value: "Infantry" }, 0),
    ).toMatchObject({ ok: true });
    expect(service.removeStructure(at(base + 1), 0)).toMatchObject({
      ok: true,
    });
  });

  it("does not mark a standard structure as an extension", () => {
    expect(described(new GedcomLanguageService(text), base)).toMatchObject({
      extension: false,
    });
  });
});

describe("what the review of the line-break answers found", () => {
  const base = G7.length;

  it("leaves NAME alone when a given name is set over two lines", () => {
    const text = [
      ...G7,
      "0 @I1@ INDI",
      "1 NAME Maria /Curie/",
      "2 GIVN Maria",
      "0 TRLR",
    ].join("\n");
    const result = new GedcomLanguageService(text).setValue(
      at(base + 2),
      { value: "Ma\nria" },
      0,
    );
    if (!result.ok) {
      throw new Error(result.code);
    }

    expect(
      applyEdits(text, result.edit.edits)
        .split("\n")
        .slice(base + 1, base + 4),
    ).toEqual(["1 NAME Maria /Curie/", "2 GIVN Ma", "3 CONT ria"]);
  });

  it("takes every space before the next piece when the first word is emptied", () => {
    const text = [
      ...G7,
      "0 @I1@ INDI",
      "1 NAME Maria  Anna /Curie/",
      "2 GIVN Maria",
      "0 TRLR",
    ].join("\n");
    const result = new GedcomLanguageService(text).setValue(
      at(base + 2),
      { value: "" },
      0,
    );
    if (!result.ok) {
      throw new Error(result.code);
    }

    expect(applyEdits(text, result.edit.edits).split("\n")[base + 1]).toBe(
      "1 NAME Anna /Curie/",
    );
  });

  it("leaves NAME alone when emptying its only part would leave it empty", () => {
    const text = [
      ...G7,
      "0 @I1@ INDI",
      "1 NAME Maria",
      "2 GIVN Maria",
      "0 TRLR",
    ].join("\n");
    const result = new GedcomLanguageService(text).setValue(
      at(base + 2),
      { value: "" },
      0,
    );
    if (!result.ok) {
      throw new Error(result.code);
    }

    expect(applyEdits(text, result.edit.edits).split("\n")[base + 1]).toBe(
      "1 NAME Maria",
    );
  });

  it("refuses an emptied 5.5.1 given name before touching NAME", () => {
    const text = [
      ...G551,
      "0 @I1@ INDI",
      "1 NAME Maria /Curie/",
      "2 GIVN Maria",
      "0 TRLR",
    ].join("\n");

    expect(
      new GedcomLanguageService(text).setValue(
        at(G551.length + 2),
        { value: "" },
        0,
      ),
    ).toMatchObject({ ok: false, code: "value-required" });
  });

  it("allows a line break beneath an extension line, as its description says", () => {
    const text = [
      ...G7,
      "0 @I1@ INDI",
      "1 _MILITARY Cavalry",
      "2 DATE 1914",
      "0 TRLR",
    ].join("\n");
    const service = new GedcomLanguageService(text);

    expect(described(service, base + 2).lineBreaks).toBe(true);
    expect(
      service.setValue(at(base + 2), { value: "1914\n1918" }, 0),
    ).toMatchObject({ ok: true });
  });

  it("describes an extension asked about by its tag", () => {
    const service = new GedcomLanguageService(
      [...G7, "0 @I1@ INDI", "0 TRLR"].join("\n"),
    );

    expect(service.describeStructure(at(base), "_MILITARY")).toMatchObject({
      id: "INDI._MILITARY",
      extension: true,
      fields: [],
    });
  });

  it.each([
    ["a given name", "1 NAME A /B/", "GIVN"],
    ["an address", "1 RESI", "ADDR"],
  ])(
    "writes %s of 5.5.1 past 255 characters without CONC",
    (_what, parent, tag) => {
      const text = [...G551, "0 @I1@ INDI", parent, "0 TRLR"].join("\n");
      const result = new GedcomLanguageService(text).addStructure(
        at(G551.length + 1),
        tag,
        { value: "x".repeat(300) },
        0,
      );
      if (!result.ok) {
        throw new Error(result.code);
      }

      expect(result.edit.edits[0].newText).not.toContain("CONC");
    },
  );
});
