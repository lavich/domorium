import { describe, expect, it } from "vitest";
import { semanticTokens, tokenTypeIndex } from "./semanticTokens";
import {
  GedcomDocument,
  TokenNames,
  type ASTNode,
  type ASTToken,
} from "@domorium/validator";

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

  // A length taken from offsets must not count the carriage return, and the
  // line numbers must survive it.
  it("reports positions and lengths on a document with CRLF line endings", () => {
    const document = new GedcomDocument();
    document.createDocument(["0 @I1@ INDI", "1 SEX M", "0 TRLR"].join("\r\n"));

    const tokens = semanticTokens(document.getNodes());
    const tags = tokens.filter(
      (token) => token.tokenType === tokenTypeIndex(TokenNames.TAG),
    );

    expect(tags).toEqual([
      {
        line: 0,
        char: 7,
        length: 4,
        tokenType: tags[0].tokenType,
        tokenModifiers: 0,
      },
      {
        line: 1,
        char: 2,
        length: 3,
        tokenType: tags[0].tokenType,
        tokenModifiers: 0,
      },
      {
        line: 2,
        char: 2,
        length: 4,
        tokenType: tags[0].tokenType,
        tokenModifiers: 0,
      },
    ]);
  });

  // Highlighting converts every token in the document on every change. Since
  // the syntax tree started deriving `range` on access, each read costs a
  // binary search into the line index and allocates three objects — the note
  // on ASTNode says to prefer the offsets in a loop like this one. A wall
  // clock cannot guard a twofold difference honestly, so the invariant is
  // asserted directly.
  it("reads a token's range at most once", () => {
    let reads = 0;
    const token = countingToken(() => (reads += 1));

    semanticTokens([nodeOf(token)]);

    expect(reads).toBeLessThanOrEqual(1);
  });

  // `end.character - start.character` is only a length while the token stays
  // on one line. No token type that gets coloured spans lines today, so this
  // is latent rather than visible — but the offsets give the right answer
  // unconditionally and for free.
  it("takes a token's length from its offsets, not from its characters", () => {
    const token: ASTToken = {
      name: TokenNames.TAG,
      value: "SPANS",
      startOffset: 10,
      endOffset: 25,
      range: {
        start: { line: 0, character: 10 },
        end: { line: 1, character: 3 },
      },
    };

    expect(semanticTokens([nodeOf(token)])[0].length).toBe(15);
  });
});

function countingToken(onRead: () => void): ASTToken {
  return {
    name: TokenNames.TAG,
    value: "INDI",
    startOffset: 7,
    endOffset: 11,
    get range() {
      onRead();
      return {
        start: { line: 0, character: 7 },
        end: { line: 0, character: 11 },
      };
    },
  };
}

function nodeOf(token: ASTToken): ASTNode {
  return {
    level: 0,
    startOffset: token.startOffset,
    endOffset: token.endOffset,
    // Never read by semanticTokens; a literal keeps it out of the read count.
    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
    tokens: { [TokenNames.TAG]: token },
    children: [],
  };
}
