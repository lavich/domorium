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

describe("the value of a record's opening line", () => {
  const base = G7.length;
  const note = [...G7, "0 @N1@ SNOTE First line", "0 TRLR"].join("\n");

  it("writes a shared note on one line and on two, keeping the identifier and the tag", () => {
    const service = new GedcomLanguageService(note);

    expect(
      written(note, service.setValue(at(base), { value: "Other" }, 0))[base],
    ).toBe("0 @N1@ SNOTE Other");
    expect(
      written(note, service.setValue(at(base), { value: "One\nTwo" }, 0)).slice(
        base,
        base + 3,
      ),
    ).toEqual(["0 @N1@ SNOTE One", "1 CONT Two", "0 TRLR"]);
  });

  it("replaces a 5.5.1 note record's continuation lines and keeps its source", () => {
    const text = [
      ...G551,
      "0 @N1@ NOTE a",
      "1 CONC b",
      "1 CONT c",
      "1 SOUR @S1@",
      "0 @S1@ SOUR",
      "0 TRLR",
    ].join("\n");

    expect(
      written(
        text,
        new GedcomLanguageService(text).setValue(
          at(G551.length),
          { value: "one line" },
          0,
        ),
      ).slice(G551.length, G551.length + 3),
    ).toEqual(["0 @N1@ NOTE one line", "1 SOUR @S1@", "0 @S1@ SOUR"]);
  });

  it("continues a long 5.5.1 note with CONC and removes a stray continuation after its source", () => {
    const text = [
      ...G551,
      "0 @N1@ NOTE a",
      "1 CONC b",
      "1 SOUR @S1@",
      "1 CONT stray",
      "0 @S1@ SOUR",
      "0 TRLR",
    ].join("\n");
    const lines = written(
      text,
      new GedcomLanguageService(text).setValue(
        at(G551.length),
        { value: "word ".repeat(70).trim() },
        0,
      ),
    );
    const record = lines.slice(G551.length, lines.indexOf("0 @S1@ SOUR"));

    expect(record[0].startsWith("0 @N1@ NOTE word")).toBe(true);
    expect(
      record.slice(1, -1).every((line) => line.startsWith("1 CONC ")),
    ).toBe(true);
    expect(record[record.length - 1]).toBe("1 SOUR @S1@");
    expect(record.every((line) => line.length + 1 <= 255)).toBe(true);
  });

  it("keeps the terminator of a CRLF document", () => {
    const text = [...G7, "0 @N1@ SNOTE First line", "0 TRLR"].join("\r\n");
    const result = new GedcomLanguageService(text).setValue(
      at(base),
      { value: "A\nB" },
      0,
    );
    if (!result.ok) {
      throw new Error(result.code);
    }

    expect(applyEdits(text, result.edit.edits)).toContain(
      "0 @N1@ SNOTE A\r\n1 CONT B\r\n0 TRLR",
    );
  });

  it("writes the value of a custom record", () => {
    const text = [...G7, "0 @P1@ _PLAN Custom value", "0 TRLR"].join("\n");

    expect(
      written(
        text,
        new GedcomLanguageService(text).setValue(
          at(base),
          { value: "Another value" },
          0,
        ),
      )[base],
    ).toBe("0 @P1@ _PLAN Another value");
  });

  it("refuses a record of an unknown standard-looking tag", () => {
    const text = [...G7, "0 @X1@ FOO value", "0 TRLR"].join("\n");

    expect(
      new GedcomLanguageService(text).setValue(at(base), { value: "other" }, 0),
    ).toMatchObject({
      ok: false,
      code: "unknown-field",
      diagnosticCode: "VAL001",
    });
  });

  it("refuses a stale edit of a record", () => {
    expect(
      new GedcomLanguageService(note, 4).setValue(at(base), { value: "x" }, 3),
    ).toMatchObject({
      ok: false,
      code: "stale-document",
    });
  });
});

describe("a value where the standard allows none", () => {
  const base = G7.length;
  const text = [
    ...G7,
    "0 @I1@ INDI",
    "1 BIRT",
    "2 PLAC Paris",
    "3 MAP",
    "4 LATI N1",
    "4 LONG E1",
    "0 TRLR",
  ].join("\n");

  it.each([
    ["a person", base, "INDI"],
    ["the header", 0, "HEAD"],
    ["a map", base + 3, "MAP"],
  ])("is refused for %s, with the tag in data", (_what, line, tag) => {
    expect(
      new GedcomLanguageService(text).setValue(at(line), { value: "oops" }, 0),
    ).toMatchObject({
      ok: false,
      code: "value-not-allowed",
      diagnosticCode: "VAL018",
      data: { tag },
    });
  });

  it("is refused for a map given a value by addStructure", () => {
    expect(
      new GedcomLanguageService(text).addStructure(
        at(base + 2),
        "MAP",
        {
          value: "oops",
          children: [
            { tag: "LATI", value: "N1" },
            { tag: "LONG", value: "E1" },
          ],
        },
        0,
      ),
    ).toMatchObject({
      ok: false,
      code: "value-not-allowed",
      diagnosticCode: "VAL018",
      data: { tag: "MAP" },
    });
  });

  it("is refused for a child given to addStructure", () => {
    const bare = [...G7, "0 @I1@ INDI", "1 BIRT", "0 TRLR"].join("\n");

    expect(
      new GedcomLanguageService(bare).addStructure(
        at(base + 1),
        "PLAC",
        {
          value: "Paris",
          children: [
            {
              tag: "MAP",
              value: "oops",
              children: [
                { tag: "LATI", value: "N1" },
                { tag: "LONG", value: "E1" },
              ],
            },
          ],
        },
        0,
      ),
    ).toMatchObject({
      ok: false,
      code: "value-not-allowed",
      data: { tag: "MAP" },
    });
  });

  it("does not refuse an empty value for a map or a person", () => {
    const service = new GedcomLanguageService(text);

    expect(service.setValue(at(base + 3), { value: "" }, 0)).toMatchObject({
      ok: true,
    });
    expect(service.setValue(at(base), { value: "" }, 0)).toMatchObject({
      ok: true,
    });
  });

  it("is said in advance by the description, with the kind none", () => {
    const service = new GedcomLanguageService(text);

    expect(service.describeStructure(at(base))).toMatchObject({
      payload: { kind: "none" },
    });
    expect(service.describeStructure(at(0))).toMatchObject({
      payload: { kind: "none" },
    });
  });

  it("is not asked of a map added with no value", () => {
    const bare = [
      ...G7,
      "0 @I1@ INDI",
      "1 BIRT",
      "2 PLAC Paris",
      "0 TRLR",
    ].join("\n");

    expect(
      new GedcomLanguageService(bare).addStructure(
        at(base + 2),
        "MAP",
        {
          children: [
            { tag: "LATI", value: "N1" },
            { tag: "LONG", value: "E1" },
          ],
        },
        0,
      ),
    ).toMatchObject({ ok: true });
  });

  it("does not refuse an empty value for the trailer", () => {
    expect(
      new GedcomLanguageService(text).setValue(at(base + 6), { value: "" }, 0),
    ).toMatchObject({
      ok: true,
    });
  });

  it("lets a 5.5.1 family event carry a description", () => {
    const family = [...G551, "0 @F1@ FAM", "0 TRLR"].join("\n");

    expect(
      new GedcomLanguageService(family).addStructure(
        at(G551.length),
        "EVEN",
        { value: "Common Law" },
        0,
      ),
    ).toMatchObject({ ok: true });
  });

  it.each(["FAM", "INDI"])(
    "describes a 5.5.1 %s event's description as text it may leave out",
    (record) => {
      const text = [...G551, `0 @X1@ ${record}`, "1 EVEN", "0 TRLR"].join("\n");

      expect(
        new GedcomLanguageService(text).describeStructure(at(G551.length + 1)),
      ).toMatchObject({ payload: { kind: "text" }, payloadRequired: false });
    },
  );
});

describe("an emptied record", () => {
  it("is refused for a 7.0 shared note that holds nothing", () => {
    const text = [...G7, "0 @N1@ SNOTE First line", "0 TRLR"].join("\n");

    expect(
      new GedcomLanguageService(text).setValue(at(G7.length), { value: "" }, 0),
    ).toMatchObject({
      ok: false,
      code: "value-required",
      diagnosticCode: "VAL019",
      data: { tag: "SNOTE" },
    });
  });

  it("is accepted for a 7.0 shared note that holds a source", () => {
    const text = [
      ...G7,
      "0 @N1@ SNOTE First line",
      "1 SOUR @S1@",
      "0 @S1@ SOUR",
      "0 TRLR",
    ].join("\n");

    expect(
      new GedcomLanguageService(text).setValue(at(G7.length), { value: "" }, 0),
    ).toMatchObject({
      ok: true,
    });
  });

  it("is refused for a 5.5.1 note record", () => {
    const text = [...G551, "0 @N1@ NOTE a", "0 TRLR"].join("\n");

    expect(
      new GedcomLanguageService(text).setValue(
        at(G551.length),
        { value: "" },
        0,
      ),
    ).toMatchObject({
      ok: false,
      code: "value-required",
      diagnosticCode: "VAL003",
    });
  });
});

describe("checking a value before it is written", () => {
  const base = G7.length;
  const text = [
    ...G7,
    "0 @N1@ SNOTE First line",
    "0 @I1@ INDI",
    "1 BIRT",
    "2 PLAC Paris",
    "3 MAP",
    "4 LATI N1",
    "4 LONG E1",
    "0 TRLR",
  ].join("\n");
  const check = (line: number, tag: string, value: string) =>
    new GedcomLanguageService(text).validateValue(
      at(line),
      tag,
      { value },
      { replacing: true },
    );

  it("finds nothing wrong with the text of a shared note", () => {
    expect(check(base, "SNOTE", "Second text")).toEqual({
      ok: true,
      problems: [],
    });
  });

  it.each([
    ["a person", base + 1, "INDI"],
    ["a map", base + 4, "MAP"],
  ])("names a value for %s", (_what, line, tag) => {
    expect(check(line, tag, "oops")).toMatchObject({
      ok: true,
      problems: [
        { code: "value-not-allowed", diagnosticCode: "VAL018", data: { tag } },
      ],
    });
  });

  it("names an emptied shared note that holds nothing", () => {
    expect(check(base, "SNOTE", "")).toMatchObject({
      ok: true,
      problems: [
        {
          code: "value-required",
          diagnosticCode: "VAL019",
          data: { tag: "SNOTE" },
        },
      ],
    });
  });
});
