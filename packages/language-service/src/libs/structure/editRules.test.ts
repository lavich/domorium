import { describe, expect, it } from "vitest";

import { GedcomLanguageService } from "../../languageService";
import type { EditRefusal, StructureEditResult } from "../../types";

const G7 = ["0 HEAD", "1 GEDC", "2 VERS 7.0"];
const G551 = [
  "0 HEAD",
  "1 GEDC",
  "2 VERS 5.5.1",
  "2 FORM LINEAGE-LINKED",
  "1 CHAR UTF-8",
];
const at = (line: number) => ({ line, character: 0 });
const textOf = (lines: string[]) => lines.join("\n");

type Result = StructureEditResult | EditRefusal;

function refusal(result: Result): EditRefusal {
  if (result.ok) {
    throw new Error("expected a refusal");
  }
  return result;
}

function accepted(result: Result): StructureEditResult {
  if (!result.ok) {
    throw new Error(`refused: ${result.code} ${result.message}`);
  }
  return result;
}

describe("a value that breaks a rule is refused with the rule", () => {
  const sevenName = [...G7, "0 @I1@ INDI", "1 NAME A /B/", "0 TRLR"];
  const fiveName = [
    ...G551,
    "0 @I1@ INDI",
    "1 NAME A /B/",
    "2 GIVN A",
    "0 TRLR",
  ];
  const seven = () => new GedcomLanguageService(textOf(sevenName));
  const five = () => new GedcomLanguageService(textOf(fiveName));

  it("refuses a value outside an enumeration", () => {
    const result = refusal(
      seven().addStructure(at(4), "TYPE", { value: "nonsense" }, 0),
    );

    expect(result.code).toBe("value-not-in-enum");
    expect(result.diagnosticCode).toBe("VAL005");
  });

  it("refuses a second occurrence of a field that may occur once", () => {
    expect(
      refusal(five().addStructure(at(6), "GIVN", { value: "B" }, 0)).code,
    ).toBe("cardinality-exceeded");
  });

  it("refuses one more occurrence where there are already too many", () => {
    const service = new GedcomLanguageService(
      textOf([
        ...G551,
        "0 @I1@ INDI",
        "1 NAME A /B/",
        "2 GIVN A",
        "2 GIVN B",
        "0 TRLR",
      ]),
    );

    expect(
      refusal(service.addStructure(at(6), "GIVN", { value: "C" }, 0)).code,
    ).toBe("cardinality-exceeded");
  });

  it("refuses a tag the dialect does not define there, though the validator warns", () => {
    expect(
      refusal(five().addStructure(at(6), "TRAN", { value: "x" }, 0)).code,
    ).toBe("unknown-field");
  });

  it("refuses a value that fails its datatype", () => {
    const service = new GedcomLanguageService(
      textOf([...G7, "0 @I1@ INDI", "1 BIRT", "2 DATE 1 JAN 1900", "0 TRLR"]),
    );

    expect(
      refusal(service.setValue(at(5), { value: "not a date" }, 0)).code,
    ).toBe("payload-datatype");
  });

  it.each([
    ["7.0", G7],
    ["5.5.1", G551],
  ] as const)(
    "refuses an impossible day with its own code in %s",
    (_name, header) => {
      const service = new GedcomLanguageService(
        textOf([
          ...header,
          "0 @I1@ INDI",
          "1 BIRT",
          "2 DATE 1 JAN 1900",
          "0 TRLR",
        ]),
      );

      const result = refusal(
        service.setValue(at(header.length + 2), { value: "31 FEB 1900" }, 0),
      );

      expect(result.code).toBe("payload-datatype");
      expect(result.diagnosticCode).toBe("VAL014");
      expect(result.data).toEqual({ day: 31, month: "FEB", monthLength: 28 });
    },
  );

  it("refuses an empty value where one is required", () => {
    expect(
      refusal(five().addStructure(at(6), "NICK", { value: "" }, 0)).code,
    ).toBe("value-required");
  });

  it("refuses a pointer to a record the document does not hold", () => {
    const result = refusal(
      seven().addStructure(at(4), "SOUR", { pointer: "@S9@" }, 0),
    );

    expect(result.code).toBe("unresolved-pointer");
    expect(result.data).toEqual({ xref: "@S9@", requiredRecordTag: "SOUR" });
  });

  it("writes a pointer to a record the document holds as it is", () => {
    const text = textOf([
      ...G551,
      "0 @I1@ INDI",
      "1 NAME A /B/",
      "0 @S1@ SOUR",
      "0 TRLR",
    ]);
    const service = new GedcomLanguageService(text);

    const result = accepted(
      service.addStructure(at(6), "SOUR", { pointer: "@S1@" }, 0),
    );

    expect(result.edit.edits[0].newText).toContain("2 SOUR @S1@");
  });

  it("writes a 5.5.1 calendar date as given", () => {
    const service = new GedcomLanguageService(
      textOf([...G551, "0 @I1@ INDI", "1 BIRT", "0 TRLR"]),
    );

    const result = accepted(
      service.addStructure(
        at(6),
        "DATE",
        { value: "@#DJULIAN@ 3 MAR 1721" },
        0,
      ),
    );

    expect(result.edit.edits[0].newText).toContain(
      "2 DATE @#DJULIAN@ 3 MAR 1721",
    );
  });

  it("refuses removing the only LANG of a translation", () => {
    const service = new GedcomLanguageService(
      textOf([
        ...G7,
        "0 @I1@ INDI",
        "1 NAME A /B/",
        "2 TRAN A /C/",
        "3 LANG en",
        "0 TRLR",
      ]),
    );

    expect(refusal(service.removeStructure(at(6), 0))).toMatchObject({
      code: "required-field-missing",
      data: { missingTag: "LANG", parentTag: "TRAN" },
    });
  });

  it("does not refuse for a required field that was already missing", () => {
    const service = new GedcomLanguageService(
      textOf([...G7, "0 @I1@ INDI", "1 NAME A /B/", "2 TRAN A /C/", "0 TRLR"]),
    );

    expect(
      accepted(service.addStructure(at(5), "NICK", { value: "n" }, 0)).warnings,
    ).toEqual([]);
  });

  it("returns a warning beside the edit instead of refusing", () => {
    const service = new GedcomLanguageService(
      textOf([...G551, "0 @I1@ INDI", "0 TRLR"]),
    );

    const result = accepted(service.addStructure(at(5), "BIRT", {}, 0));

    expect(result.warnings.map((warning) => warning.code)).toEqual(["VAL010"]);
  });

  it("does not refuse an unrelated part because of an old error", () => {
    const service = new GedcomLanguageService(
      textOf([
        ...G7,
        "0 @I1@ INDI",
        "1 NAME A /B/",
        "2 TYPE nonsense",
        "2 GIVN A",
        "0 TRLR",
      ]),
    );

    expect(
      accepted(service.setValue(at(6), { value: "Bea" }, 0)).warnings,
    ).toEqual([]);
  });

  it("refuses a bad value replaced by another bad value", () => {
    const service = new GedcomLanguageService(
      textOf([
        ...G7,
        "0 @I1@ INDI",
        "1 NAME A /B/",
        "2 TYPE nonsense",
        "0 TRLR",
      ]),
    );

    expect(
      refusal(service.setValue(at(5), { value: "other nonsense" }, 0)).code,
    ).toBe("value-not-in-enum");
  });

  it("refuses with the validator's own code when no named code fits", () => {
    const service = new GedcomLanguageService(
      textOf([...G7, "0 @I1@ INDI", "0 TRLR"]),
    );

    const result = refusal(service.setValue(at(2), { value: "9.9" }, 0));

    expect(result.code).toBe("rule-violation");
    expect(result.diagnosticCode).toBe("VAL011");
  });
});
