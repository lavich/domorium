import { describe, expect, it } from "vitest";
import { semanticTokens } from "./semanticTokens";
import { GedcomDocument } from "@domorium/validator";

const gedcomDocument = new GedcomDocument();
gedcomDocument.createDocument(`0 @Abraham_Simpson@ INDI`);

describe("semanticTokens", () => {
  it("parse SAMPLE", () => {
    const res = semanticTokens(gedcomDocument.getNodes());

    expect(res[0]).toStrictEqual({
      line: 0,
      char: 0,
      length: 1,
      tokenType: 0,
      tokenModifiers: 0,
    });
    expect(res[1]).toStrictEqual({
      line: 0,
      char: 2,
      length: 17,
      tokenType: 1,
      tokenModifiers: 1,
    });
  });
});
