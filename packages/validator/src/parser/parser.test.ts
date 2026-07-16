import { describe, expect, it } from "vitest";
import { GedcomParser } from "./parser";
import { ConfigurableLexer, gedcomLexerDefinition } from "./lexer";

describe("parser", () => {
  it("parse SAMPLE", () => {
    const SAMPLE = `0 @I1@ INDI
1 NAME John /Doe/
1 BIRT
1 BIRT
2 DATE 1 JAN 1900
0 @I2@ INDI
3 FAM @i2@
1 NAME Jane /Doe/`;
    const gedcomLexer = new ConfigurableLexer({ zeroBased: true });
    const lexingResult = gedcomLexer.tokenize(SAMPLE);
    const parser = new GedcomParser(gedcomLexerDefinition);
    parser.input = lexingResult.tokens;

    parser.root();

    expect(parser.errors.length).toBe(0);
    expect(lexingResult.errors.length).toBe(0);
    expect(lexingResult.tokens.length).toBe(22);
  });

  it("parses a level-0 pointer line that also carries a value (GEDCOM 7 SNOTE record), and keeps parsing the rest of the file", () => {
    const SAMPLE = `0 @N1@ SNOTE Shared note text
0 @I1@ INDI
1 NAME John /Doe/`;
    const gedcomLexer = new ConfigurableLexer({ zeroBased: true });
    const lexingResult = gedcomLexer.tokenize(SAMPLE);
    const parser = new GedcomParser(gedcomLexerDefinition);
    parser.input = lexingResult.tokens;
    const cst = parser.root();

    expect(lexingResult.errors.length).toBe(0);
    expect(parser.errors.length).toBe(0);
    expect(cst.children.line?.length).toBe(3);
  });
});
