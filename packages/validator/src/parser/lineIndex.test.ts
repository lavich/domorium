import { describe, expect, it } from "vitest";
import { createLineIndex, offsetToPosition } from "./lineIndex";
import { ConfigurableLexer } from "./lexer";

describe("offsetToPosition", () => {
  it("maps offsets on the first line", () => {
    const index = createLineIndex("0 HEAD\n1 GEDC\n");

    expect(offsetToPosition(index, 0)).toEqual({ line: 0, character: 0 });
    expect(offsetToPosition(index, 2)).toEqual({ line: 0, character: 2 });
  });

  it("maps offsets on later lines", () => {
    const index = createLineIndex("0 HEAD\n1 GEDC\n2 VERS 7.0\n");

    expect(offsetToPosition(index, 7)).toEqual({ line: 1, character: 0 });
    expect(offsetToPosition(index, 9)).toEqual({ line: 1, character: 2 });
    expect(offsetToPosition(index, 14)).toEqual({ line: 2, character: 0 });
  });

  it("counts the carriage return of a CRLF ending as part of its line", () => {
    const index = createLineIndex("0 HEAD\r\n1 GEDC\r\n");

    expect(offsetToPosition(index, 6)).toEqual({ line: 0, character: 6 });
    expect(offsetToPosition(index, 8)).toEqual({ line: 1, character: 0 });
  });

  it("maps an offset past the last line start", () => {
    const index = createLineIndex("0 HEAD\n0 TRLR");

    expect(offsetToPosition(index, 12)).toEqual({ line: 1, character: 5 });
  });

  it("handles an empty document", () => {
    const index = createLineIndex("");

    expect(offsetToPosition(index, 0)).toEqual({ line: 0, character: 0 });
  });

  // The syntax tree is about to carry offsets instead of line/character pairs,
  // and every consumer keeps reading line/character. Converting one to the
  // other has to agree with the lexer exactly, on every token, or diagnostics
  // land on the wrong text.
  it("agrees with the lexer's own line and character for every token", () => {
    const text =
      "0 HEAD\r\n" +
      "1 GEDC\n" +
      "2 VERS 7.0\n" +
      "0 @I1@ INDI\n" +
      "1 NAME Ada /Lovelace/\n" +
      "1 NOTE A note that\n" +
      "2 CONT continues on the next line\n" +
      "0 @F1@ FAM\n" +
      "1 HUSB @I1@\n" +
      "0 TRLR\n";
    const index = createLineIndex(text);
    const { tokens } = new ConfigurableLexer({ zeroBased: true }).tokenize(
      text,
    );

    expect(tokens.length).toBeGreaterThan(20);
    for (const token of tokens) {
      expect({
        start: offsetToPosition(index, token.startOffset),
        end: offsetToPosition(
          index,
          (token.endOffset ?? token.startOffset) + 1,
        ),
      }).toEqual({
        start: { line: token.startLine, character: token.startColumn },
        end: { line: token.endLine, character: (token.endColumn ?? 0) + 1 },
      });
    }
  });
});

// #251: 5.5.1 ends a line with CR, LF, CR-LF or LF-CR. Only two of the four were
// counted, so a CR-only file was one line.
describe("line terminators", () => {
  const positionOf = (eol: string) => {
    const text = ["0 HEAD", "1 GEDC", "2 VERS 5.5.1"].join(eol);
    const index = createLineIndex(text);
    return offsetToPosition(index, text.indexOf("2 VERS"));
  };

  it.each([
    ["LF", "\n"],
    ["CR-LF", "\r\n"],
    ["CR", "\r"],
    ["LF-CR", "\n\r"],
  ])("puts the third line on line 2 with %s", (_name, eol) => {
    expect(positionOf(eol)).toEqual({ line: 2, character: 0 });
  });

  it("reads CR-LF as one terminator, not as an empty line between", () => {
    const index = createLineIndex("0 HEAD\r\n1 GEDC\r\n");
    expect(index.length).toBe(3);
  });
});
