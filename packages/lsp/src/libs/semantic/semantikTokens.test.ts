import { describe, expect, it } from "vitest";
import { semanticTokens, tokenTypeIndex } from "./semanticTokens";
import { GedcomDocument, TokenNames } from "@domorium/validator";

const gedcomDocument = new GedcomDocument();
gedcomDocument.createDocument(`0 @Abraham_Simpson@ INDI`);

describe("semanticTokens", () => {
  it("parse SAMPLE", () => {
    const res = semanticTokens(gedcomDocument.getNodes());

    expect(res[0]).toStrictEqual({
      line: 0,
      char: 0,
      length: 1,
      tokenType: tokenTypeIndex(TokenNames.LEVEL),
      tokenModifiers: 0,
    });
    expect(res[1]).toStrictEqual({
      line: 0,
      char: 2,
      length: 17,
      tokenType: tokenTypeIndex(TokenNames.POINTER),
      tokenModifiers: 1,
    });
  });

  it("colors LEVEL, POINTER, and TAG as semantic tokens", () => {
    const res = semanticTokens(gedcomDocument.getNodes());
    const tagToken = res.find((t) => t.length === 4);

    expect(res[0].tokenType).toBe(tokenTypeIndex(TokenNames.LEVEL));
    expect(tagToken?.tokenType).toBe(tokenTypeIndex(TokenNames.TAG));
  });
});
