import { describe, it, expect } from "vitest";
import { ConfigurableLexer } from "./lexer";

const gedcomLexer = new ConfigurableLexer({ zeroBased: true });

describe("positive tests", () => {
  it("parse level and tag", () => {
    const { tokens, errors } = gedcomLexer.tokenize("1 BIRT");
    expect(errors.length).toBe(0);
    expect(tokens.length).toBe(2);
    expect(tokens[0].startColumn).toBe(0);
    expect(tokens[0].endColumn).toBe(0);
    expect(tokens[1].startColumn).toBe(2);
    expect(tokens[1].endColumn).toBe(5);
  });

  it("parse level, tag, value", () => {
    const { tokens, errors } = gedcomLexer.tokenize("1 BIRT VALU E");
    expect(errors.length).toBe(0);
    expect(tokens.length).toBe(3);
  });

  it("parse new line with level, tag, value", () => {
    const { tokens, errors } = gedcomLexer.tokenize(
      "1 NAME John /Doe/\n1 NAME John /Doe/",
    );
    expect(errors.length).toBe(0);
    expect(tokens.length).toBe(6);
  });

  it("parse level, pointer, tag", () => {
    const { tokens, errors } = gedcomLexer.tokenize(
      "1 @POINTER@ BIRT \n1 @POINTER@ BIRT",
    );
    expect(errors.length).toBe(0);
    expect(tokens.length).toBe(6);
  });

  it("parse level, pointer, tag, value with multiple words", () => {
    const { tokens, errors } = gedcomLexer.tokenize("1 @POINTER@ BIRT er df");
    expect(errors.length).toBe(0);
    expect(tokens.length).toBe(4);
    expect(tokens[3].image).toBe("er df");
  });

  it("parse new level", () => {
    const { tokens, errors } = gedcomLexer.tokenize("1 BIRT VALU E\n2 TEST e");
    expect(errors.length).toBe(0);
    expect(tokens.length).toBe(6);
  });

  it("parse level, pointer, tag, value (e.g. GEDCOM 7 SNOTE record)", () => {
    const { tokens, errors } = gedcomLexer.tokenize("0 @N1@ SNOTE Shared note");
    expect(errors.length).toBe(0);
    expect(tokens.length).toBe(4);
    expect(tokens[3].image).toBe("Shared note");
  });

  it("keeps every space past the one that delimits the value", () => {
    const { tokens, errors } = gedcomLexer.tokenize("1 NOTE     indented");
    expect(errors.length).toBe(0);
    expect(tokens[2].image).toBe("    indented");
  });

  it("reads a value that is only spaces", () => {
    const { tokens, errors } = gedcomLexer.tokenize("2 CONT  ");
    expect(errors.length).toBe(0);
    expect(tokens[2].image).toBe(" ");
  });

  it("gives a tag no value when only the delimiter follows", () => {
    const { tokens, errors } = gedcomLexer.tokenize("2 CONT ");
    expect(errors.length).toBe(0);
    expect(tokens.length).toBe(2);
  });

  it("still reads an xref rather than a value", () => {
    const { tokens, errors } = gedcomLexer.tokenize("1 HUSB @I1@");
    expect(errors.length).toBe(0);
    expect(tokens[2].tokenType.name).toBe("XREF");
  });

  // Issue #95: the specification permits a byte order mark, and 19 of the 22
  // official test files carry one. The character is invisible in a diff, so it
  // is written as an escape here on purpose.
  describe("byte order mark", () => {
    const BOM = "\uFEFF";

    it("skips one at the start of the document", () => {
      const { tokens, errors } = gedcomLexer.tokenize(`${BOM}0 HEAD`);
      expect(errors).toEqual([]);
      expect(tokens.length).toBe(2);
    });

    it("leaves every offset where it was", () => {
      const source = "0 HEAD\n1 GEDC\n2 VERS 7.0";
      const plain = gedcomLexer.tokenize(source);
      const marked = gedcomLexer.tokenize(BOM + source);

      // The one thing that would break if the mark were stripped from the text
      // instead: each range would slide by a character, and diagnostics are
      // placed by offset.
      expect(marked.errors).toEqual([]);
      expect(marked.tokens.map((t) => t.startOffset)).toEqual(
        plain.tokens.map((t) => t.startOffset + 1),
      );
      // Only the first line is pushed along by it; columns restart after a
      // newline, so every later line reads exactly as it did.
      expect(marked.tokens.map((t) => [t.startLine, t.startColumn])).toEqual(
        plain.tokens.map((t) => [
          t.startLine,
          t.startLine === 0 ? t.startColumn! + 1 : t.startColumn,
        ]),
      );
    });

    it("still reports one at the start of a later line", () => {
      const { errors } = gedcomLexer.tokenize(`0 HEAD\n${BOM}0 TRLR`);
      expect(errors.length).toBe(1);
      expect(errors[0].line).toBe(1);
    });

    it("keeps one inside a payload, where it is an ordinary character", () => {
      const { tokens, errors } = gedcomLexer.tokenize(`1 NAME A${BOM}B`);
      expect(errors).toEqual([]);
      expect(tokens[2].image).toBe(`A${BOM}B`);
    });
  });

  it("parse SAMPLE", () => {
    const SAMPLE = `0 @I1@ INDI
1 NAME John /Doe/
1 BIRT
1 BIRT
2 DATE 1 JAN 1900
0 @I2@ INDI
3 FAM @i2@
1 NAME Jane /Doe/`;
    const { tokens, errors } = gedcomLexer.tokenize(SAMPLE);
    expect(errors.length).toBe(0);
    expect(tokens.length).toBe(22);
  });
});

// #252: the tag pattern was upper case only, so `NoTe` matched as far as `N` and
// the rest became a value — a tag that is nowhere in the file.
describe("a tag written in mixed case", () => {
  it("is read as the file wrote it", () => {
    const { tokens, errors } = gedcomLexer.tokenize("1 NoTe hello");

    expect(errors).toEqual([]);
    expect(tokens.map((token) => [token.tokenType.name, token.image])).toEqual([
      ["LEVEL", "1"],
      ["TAG", "NoTe"],
      ["VALUE", "hello"],
    ]);
  });

  it("does not turn a line without a level into one", () => {
    const { tokens } = gedcomLexer.tokenize("hello world");

    expect(tokens.every((token) => token.tokenType.name !== "Level")).toBe(
      true,
    );
  });
});
