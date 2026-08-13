import { describe, expect, it } from "vitest";

import { GedcomDocument } from "../document/gedcomDocument";
import { GedcomErrorCode } from "../types/errors";

const read = (text: string) => {
  const document = new GedcomDocument().createDocument(text);
  return {
    resolution: document.getVersionResolution(),
    codes: document.getErrors().map((error) => error.code),
    errors: document.getErrors(),
  };
};

const header = (...lines: string[]) =>
  ["0 HEAD", ...lines, "0 TRLR", ""].join("\n");

describe("a header that names a system", () => {
  it("is Personal Ancestral File when SYST comes first", () => {
    const { resolution } = read(header("1 SYST PAF", "2 VERS 5.0"));

    expect(resolution?.kind).toBe("paf");
  });

  it("is Personal Ancestral File even where GEDC follows and names a version", () => {
    const { resolution, codes } = read(
      header("1 SYST PAF", "2 VERS 5.0", "1 GEDC", "2 VERS 5.5.1"),
    );

    expect(resolution?.kind).toBe("paf");
    expect(
      codes,
      "the 5.5.1 schema does not apply, so nothing is reported from it",
    ).toEqual([GedcomErrorCode.PersonalAncestralFile]);
  });

  it("is not Personal Ancestral File when GEDC comes first", () => {
    const { resolution } = read(header("1 GEDC", "2 VERS 7.0", "1 SYST PAF"));

    expect(resolution?.kind).toBe("supported");
  });

  it("says which system the header named", () => {
    const { errors } = read(header("1 SYST PAF"));

    expect(errors[0].message).toContain("1 SYST PAF");
    expect(
      errors[0].level,
      "the file is readable, just not ours to judge",
    ).toBe("warning");
  });

  it("reports it without a name where the header gives none", () => {
    const { resolution, errors } = read(header("1 SYST"));

    expect(resolution?.kind).toBe("paf");
    expect(errors[0].message).not.toContain("()");
  });

  it("leaves a header with no system alone", () => {
    expect(read(header("1 GEDC", "2 VERS 7.0")).resolution?.kind).toBe(
      "supported",
    );
    expect(read(header("1 GEDC")).resolution?.kind).toBe("undetermined");
  });
});
