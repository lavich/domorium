import { describe, expect, it } from "vitest";

import { GedcomDocument } from "./gedcomDocument";
import { GedcomErrorCode } from "../types/errors";

const HEADER = "0 HEAD\n1 GEDC\n2 VERS 7.0\n";

function errorsOf(text: string) {
  return new GedcomDocument().createDocument(text).getErrors();
}

function missingTrailer(text: string) {
  return errorsOf(text).filter((error) => error.data?.missingTag === "TRLR");
}

describe("a document without a trailer", () => {
  it("reports the trailer as missing, naming the tag", () => {
    const errors = missingTrailer(`${HEADER}0 @I1@ INDI\n1 NAME A /B/\n`);

    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe(GedcomErrorCode.MissingTag);
  });

  it("reports it on the text of the last line", () => {
    const [error] = missingTrailer(`${HEADER}0 @I1@ INDI\n1 NAME A /B/\n`);

    expect(error.range).toEqual({
      start: { line: 4, character: 0 },
      end: { line: 4, character: 12 },
    });
  });

  it("reports it on the same line without a final terminator", () => {
    const [error] = missingTrailer(`${HEADER}0 @I1@ INDI\n1 NAME A /B/`);

    expect(error.range.start.line).toBe(4);
  });

  it("skips blank lines after the last record", () => {
    const [error] = missingTrailer(`${HEADER}0 @I1@ INDI\n1 NAME A /B/\n\n\n`);

    expect(error.range.start.line).toBe(4);
  });

  it("skips a line that is not a GEDCOM line after the last record", () => {
    const [error] = missingTrailer(
      `${HEADER}0 @I1@ INDI\n1 NAME A /B/\ngarbage\n`,
    );

    expect(error.range.start.line).toBe(4);
  });

  it("reports it on a document whose last record has a great many children", () => {
    const text = `${HEADER}0 @N1@ NOTE x\n${"1 CONT y\n".repeat(150_000)}`;

    const [error] = missingTrailer(text);

    expect(error.range.start.line).toBe(150_003);
  });

  it("does not report a trailer that is there", () => {
    expect(missingTrailer(`${HEADER}0 TRLR\n`)).toEqual([]);
  });

  it("leaves another missing root tag where it was, without the tag name", () => {
    const missing = errorsOf(
      "0 HEAD\n1 GEDC\n2 VERS 5.5.1\n2 FORM LINEAGE-LINKED\n1 CHAR UTF-8\n0 TRLR\n",
    ).filter((error) => error.code === GedcomErrorCode.MissingTag);

    expect(missing.length).toBeGreaterThan(0);
    for (const error of missing) {
      expect(error.range.start).toEqual({ line: 0, character: 0 });
      expect(error.data?.missingTag).toBeUndefined();
    }
  });
});

describe("a document without a header", () => {
  const undetermined = (text: string) =>
    errorsOf(text).find(
      (error) => error.code === GedcomErrorCode.UndeterminedVersion,
    );

  it("says the header is missing when the first record is not one", () => {
    expect(undetermined("0 @I1@ INDI\n0 TRLR\n")?.data?.missingHeader).toBe(
      true,
    );
  });

  it("says the header is missing for an empty document", () => {
    expect(undetermined("")?.data?.missingHeader).toBe(true);
  });

  it("does not say so of a fragment, which has no header to lack", () => {
    const error = new GedcomDocument()
      .createDocument("0 @I1@ INDI\n", { fragment: true })
      .getErrors()
      .find((found) => found.code === GedcomErrorCode.UndeterminedVersion);

    expect(error).toBeDefined();
    expect(error?.data).toBeUndefined();
  });

  it("does not say so for a header that names no version", () => {
    const error = undetermined("0 HEAD\n0 TRLR\n");

    expect(error).toBeDefined();
    expect(error?.data?.missingHeader).toBeUndefined();
  });
});
