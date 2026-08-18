import { describe, expect, it } from "vitest";

import { GedcomLanguageService } from "../../languageService";

// Line 6 is `1 FAMS @F1@`, and the FAM record it names runs from line 8 to 10.
const GEDCOM = [
  "0 HEAD",
  "1 GEDC",
  "2 VERS 7.0",
  "0 @I1@ INDI",
  "1 NAME Homer /Simpson/",
  "1 SEX M",
  "1 FAMS @F1@",
  "1 FAMC @F9@",
  "0 @F1@ FAM",
  "1 HUSB @I1@",
  "1 WIFE @I2@",
  "0 TRLR",
].join("\n");

const service = new GedcomLanguageService(GEDCOM);

const ON_POINTER = { line: 6, character: 9 };
const POINTER_RANGE = {
  start: { line: 6, character: 7 },
  end: { line: 6, character: 11 },
};

describe("the record a pointer names", () => {
  it("reaches from the declaration through the end of the last line shown", () => {
    expect(service.getRecordPreview(ON_POINTER, { maxLines: 24 })).toEqual({
      range: {
        start: { line: 8, character: 0 },
        end: { line: 10, character: "1 WIFE @I2@".length },
      },
      pointer: POINTER_RANGE,
      truncated: false,
    });
  });

  it("is cut to the lines the host has room for, and says it was cut", () => {
    expect(service.getRecordPreview(ON_POINTER, { maxLines: 2 })).toEqual({
      range: {
        start: { line: 8, character: 0 },
        end: { line: 9, character: "1 HUSB @I1@".length },
      },
      pointer: POINTER_RANGE,
      truncated: true,
    });
  });

  it("is not cut where the record ends within the room given", () => {
    expect(service.getRecordPreview(ON_POINTER, { maxLines: 3 })).toMatchObject(
      {
        range: { end: { line: 10 } },
        truncated: false,
      },
    );
  });

  it("has no answer for a pointer with nothing to point at", () => {
    expect(
      service.getRecordPreview({ line: 7, character: 9 }, { maxLines: 24 }),
    ).toBeNull();
  });

  it("has no answer where the declaration is the line being pointed at", () => {
    expect(
      service.getRecordPreview({ line: 8, character: 3 }, { maxLines: 24 }),
    ).toBeNull();
  });

  it("has no answer away from a pointer", () => {
    expect(
      service.getRecordPreview({ line: 4, character: 3 }, { maxLines: 24 }),
    ).toBeNull();
  });
});
