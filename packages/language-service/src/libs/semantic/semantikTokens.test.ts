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

    // Checked field by field: line and char are derived on access rather
    // than stored, so the token is not a plain object.
    expect(res[0]).toMatchObject({
      line: 0,
      char: 0,
      length: 1,
      startOffset: 0,
      endOffset: 1,
      tokenType: tokenTypeIndex(TokenNames.LEVEL),
      tokenModifiers: 0,
    });
    expect(res[1]).toMatchObject({
      line: 0,
      char: 2,
      length: 17,
      startOffset: 2,
      endOffset: 19,
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
  // The words a host's theme already holds: a tag is the keyword of a line, an
  // identifier is a variable, and a payload is the value.
  it("types a tag, an identifier and a payload by what they are", () => {
    const source = "0 @I1@ INDI\n1 NAME Ada /Lovelace/\n0 TRLR\n";
    const gedcom = new GedcomDocument();
    gedcom.createDocument(source);
    const tokens = semanticTokens(gedcom.getNodes());
    const typeOf = (text: string) =>
      tokens.find(
        (token) => source.slice(token.startOffset, token.endOffset) === text,
      )?.tokenType;

    expect(typeOf("INDI")).toBe(tokenTypeIndex(TokenNames.TAG));
    expect(typeOf("@I1@")).toBe(tokenTypeIndex(TokenNames.POINTER));
    expect(typeOf("Ada /Lovelace/")).toBe(tokenTypeIndex(TokenNames.VALUE));
    expect(tokenTypeIndex(TokenNames.TAG)).not.toBe(
      tokenTypeIndex(TokenNames.POINTER),
    );
  });

  it("reports positions and lengths on a document with CRLF line endings", () => {
    const document = new GedcomDocument();
    document.createDocument(["0 @I1@ INDI", "1 SEX M", "0 TRLR"].join("\r\n"));

    const tokens = semanticTokens(document.getNodes());
    const tags = tokens.filter(
      (token) => token.tokenType === tokenTypeIndex(TokenNames.TAG),
    );

    // The offsets and the derived positions must agree across the carriage
    // returns: "0 @I1@ INDI\r\n1 SEX M\r\n0 TRLR".
    expect(
      tags.map(({ line, char, length, startOffset, endOffset }) => ({
        line,
        char,
        length,
        startOffset,
        endOffset,
      })),
    ).toEqual([
      { line: 0, char: 7, length: 4, startOffset: 7, endOffset: 11 },
      { line: 1, char: 2, length: 3, startOffset: 15, endOffset: 18 },
      { line: 2, char: 2, length: 4, startOffset: 24, endOffset: 28 },
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

    const [semantic] = semanticTokens([nodeOf(token)]);
    // Both, and more than once each: still one derivation.
    void [semantic.line, semantic.char, semantic.line, semantic.char];

    expect(reads).toBeLessThanOrEqual(1);
  });

  // Two of the four hosts address everything by offset, and the syntax tree
  // holds offsets. Deriving a position for them, so the adapter can convert it
  // straight back, cost 387 ms on a 15.6 MB document — see #68.
  it("carries offsets, and derives no position for a caller that wants them", () => {
    let reads = 0;
    const token = countingToken(() => (reads += 1));

    const [semantic] = semanticTokens([nodeOf(token)]);

    expect(semantic.startOffset).toBe(7);
    expect(semantic.endOffset).toBe(11);
    expect(semantic.length).toBe(4);
    expect(reads).toBe(0);
  });

  // A viewport is forty lines; a document can be two hundred thousand
  // records. Converting all of them to answer about the visible ones is what
  // is left of the pause after an edit — 821 ms on a 15.6 MB file. Counting
  // the records reached says whether the walk was actually narrowed, which
  // filtering the output afterwards would not.
  it("reaches only the records overlapping the requested range", () => {
    let visited = 0;
    const records = Array.from({ length: 100 }, (_, index) =>
      countingRecord(index, () => (visited += 1)),
    );

    // Record 42 occupies offsets 504 to 515.
    const tokens = semanticTokens(records, { from: 506, to: 510 });

    expect(visited).toBe(1);
    expect(tokens.map((token) => token.startOffset)).toEqual([511]);
  });

  it("returns every record when no range is asked for", () => {
    let visited = 0;
    const records = Array.from({ length: 100 }, (_, index) =>
      countingRecord(index, () => (visited += 1)),
    );

    expect(semanticTokens(records)).toHaveLength(100);
    expect(visited).toBe(100);
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

// Records whose children cannot be reached without being counted, so a walk
// that visits the whole document is distinguishable from one that does not.
function countingRecord(index: number, onVisit: () => void): ASTNode {
  const startOffset = index * 12;
  const at = (offset: number, length: number) => ({
    start: { line: index, character: offset - startOffset },
    end: { line: index, character: offset - startOffset + length },
  });
  return {
    level: 0,
    startOffset,
    endOffset: startOffset + 11,
    range: at(startOffset, 11),
    tokens: {
      [TokenNames.TAG]: {
        name: TokenNames.TAG,
        value: "INDI",
        startOffset: startOffset + 7,
        endOffset: startOffset + 11,
        range: at(startOffset + 7, 4),
      },
    },
    get children() {
      onVisit();
      return [];
    },
  };
}

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
