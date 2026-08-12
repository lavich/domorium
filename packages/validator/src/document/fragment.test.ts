import { describe, expect, it } from "vitest";

import { GedcomDocument } from "./gedcomDocument";
import { GedcomErrorCode } from "../types/errors";

function codes(
  text: string,
  options?: Parameters<GedcomDocument["createDocument"]>[1],
) {
  const document = new GedcomDocument();
  document.createDocument(text, options);
  return document.getErrors().map((error) => error.code);
}

const FRAGMENT = "0 @I1@ INDI\n1 NAME Homer /Simpson/\n1 FAMS @F1@";

describe("checking a fragment rather than a document", () => {
  it("does not ask a fragment for the header and trailer it cannot have", () => {
    expect(codes(FRAGMENT, { fragment: true, dialect: "7.0" })).not.toContain(
      GedcomErrorCode.MissingTag,
    );
  });

  it("does not ask a fragment for a version it has no header to carry", () => {
    expect(codes(FRAGMENT, { fragment: true, dialect: "7.0" })).not.toContain(
      GedcomErrorCode.UndeterminedVersion,
    );
  });

  it("says the version is undetermined when the caller names none either", () => {
    expect(codes(FRAGMENT, { fragment: true })).toContain(
      GedcomErrorCode.UndeterminedVersion,
    );
  });

  it("lets a pointer leave the fragment: it dangles because the text stops", () => {
    expect(codes(FRAGMENT, { fragment: true, dialect: "7.0" })).not.toContain(
      GedcomErrorCode.UnresolvedXref,
    );
  });

  it("lets an extension tag stand undeclared, having no header to declare it in", () => {
    expect(
      codes("0 @I1@ INDI\n1 _WIKI https://example.org", {
        fragment: true,
        dialect: "7.0",
      }),
    ).not.toContain(GedcomErrorCode.UndocumentedTag);
  });

  it("still reads the lines: a tag the schema does not know is still wrong", () => {
    expect(
      codes("0 @I1@ INDI\n1 NOPE x", { fragment: true, dialect: "7.0" }),
    ).toContain(GedcomErrorCode.UnknownTag);
  });

  it("still reads the levels: a line that cannot follow the one above is wrong", () => {
    expect(
      codes("0 @I1@ INDI\n3 NAME x", { fragment: true, dialect: "7.0" }),
    ).toContain(GedcomErrorCode.InvalidLevel);
  });

  it("leaves a whole document judged as one", () => {
    expect(codes(FRAGMENT)).toContain(GedcomErrorCode.UndeterminedVersion);
    expect(
      codes("0 HEAD\n1 GEDC\n2 VERS 7.0\n0 @I1@ INDI\n1 FAMS @F1@\n0 TRLR"),
    ).toContain(GedcomErrorCode.UnresolvedXref);
  });
});
