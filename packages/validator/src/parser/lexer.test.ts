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

  // The delimiter moves the lexer into a mode of its own, so this is the pair
  // that breaks if that mode stops reaching Xref.
  it("still reads an xref rather than a value", () => {
    const { tokens, errors } = gedcomLexer.tokenize("1 HUSB @I1@");
    expect(errors.length).toBe(0);
    expect(tokens[2].tokenType.name).toBe("XREF");
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
