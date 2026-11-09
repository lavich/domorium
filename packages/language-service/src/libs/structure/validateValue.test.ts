import { describe, expect, it } from "vitest";

import { GedcomLanguageService } from "../../languageService";
import { refuses } from "./refusalCodes";

const G7 = ["0 HEAD", "1 GEDC", "2 VERS 7.0"];
const G551 = [
  "0 HEAD",
  "1 GEDC",
  "2 VERS 5.5.1",
  "2 FORM LINEAGE-LINKED",
  "1 CHAR UTF-8",
];
const at = (line: number) => ({ line, character: 0 });

const seven = () =>
  new GedcomLanguageService(
    [...G7, "0 @I1@ INDI", "1 NAME A /B/", "0 @S1@ SOUR", "0 TRLR"].join("\n"),
  );
const five = () =>
  new GedcomLanguageService(
    [
      ...G551,
      "0 @I1@ INDI",
      "1 NAME A /B/",
      "2 GIVN A",
      "0 @S1@ SOUR",
      "0 TRLR",
    ].join("\n"),
  );

function codes(
  service: GedcomLanguageService,
  line: number,
  tag: string,
  value: { value?: string; pointer?: string },
) {
  const result = service.validateValue(at(line), tag, value);
  if (!result.ok) {
    throw new Error(result.code);
  }
  return result.problems
    .filter((problem) =>
      refuses({ code: problem.diagnosticCode, severity: problem.severity }),
    )
    .map((problem) => problem.code);
}

describe("checking a value without an edit", () => {
  it("names a value outside an enumeration, building no edit", () => {
    const result = seven().validateValue(at(4), "TYPE", { value: "nonsense" });

    expect(result).toMatchObject({
      ok: true,
      problems: [{ code: "value-not-in-enum", diagnosticCode: "VAL005" }],
    });
  });

  it("finds no problem in a valid value", () => {
    expect(seven().validateValue(at(4), "GIVN", { value: "Anna" })).toEqual({
      ok: true,
      problems: [],
    });
  });

  it("names one occurrence too many, and none when the set replaces the one held", () => {
    expect(codes(five(), 6, "GIVN", { value: "B" })).toEqual([
      "cardinality-exceeded",
    ]);
    expect(
      five().validateValue(at(7), "GIVN", { value: "B" }, { replacing: true }),
    ).toEqual({ ok: true, problems: [] });
  });

  it("refuses a position on no structure and a document with no dialect", () => {
    expect(seven().validateValue(at(99), "GIVN", { value: "x" })).toMatchObject(
      {
        ok: false,
        code: "not-a-structure",
      },
    );
    expect(
      new GedcomLanguageService("0 @I1@ INDI\n1 NAME A /B/\n").validateValue(
        at(1),
        "GIVN",
        {
          value: "x",
        },
      ),
    ).toMatchObject({ ok: false, code: "no-dialect" });
  });

  it.each([
    ["7.0", seven, 4, "TYPE", { value: "nonsense" }],
    ["7.0", seven, 4, "TYPE", { value: "BIRTH" }],
    ["7.0", seven, 4, "SOUR", { pointer: "@S9@" }],
    ["7.0", seven, 4, "SOUR", { pointer: "@S1@" }],
    ["7.0", seven, 4, "GIVN", { value: "@home" }],
    ["5.5.1", five, 6, "GIVN", { value: "B" }],
    ["5.5.1", five, 6, "TRAN", { value: "x" }],
    ["5.5.1", five, 6, "NICK", { value: "" }],
    ["5.5.1", five, 6, "NICK", { value: "Al" }],
    ["5.5.1", five, 6, "SOUR", { pointer: "@S1@" }],
  ] as const)(
    "gives the codes the operation refuses with (%s %#)",
    (_dialect, make, line, tag, value) => {
      const operation = make().addStructure(at(line), tag, value, 0);

      expect(codes(make(), line, tag, value)).toEqual(
        operation.ok ? [] : [operation.code],
      );
    },
  );
});
