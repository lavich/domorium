import { describe, expect, test } from "vitest";
import { validate } from "./validate";
import { ConfigurableLexer, gedcomLexerDefinition } from "../parser/lexer";
import { GedcomParser } from "../parser/parser";
import { GedcomVisitor } from "../parser/visitor";

const astBuilder = (text: string) => {
  const gedcomLexer = new ConfigurableLexer({ zeroBased: true });
  const lexingResult = gedcomLexer.tokenize(text);
  const parser = new GedcomParser(gedcomLexerDefinition);
  parser.input = lexingResult.tokens;
  const cst = parser.root();
  const visitor = new GedcomVisitor();
  return visitor.root(cst);
};

describe("validator", () => {
  test("minimum required tags", async () => {
    const { nodes } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 TRLR
`);
    const errs = validate(nodes);
    expect(errs.length).toBe(0);
  });

  test("minimum required INDI", async () => {
    const { nodes } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @i1@ INDI
0 TRLR
`);
    const errs = validate(nodes);
    expect(errs.length).toBe(0);
  });

  test("minimum required FAM", async () => {
    const { nodes } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @f1@ FAM
0 TRLR
`);
    const errs = validate(nodes);
    expect(errs.length).toBe(0);
  });

  test("required enum value", async () => {
    const { nodes } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @i1@ INDI
1 SEX NON_ENUM_TAG
0 TRLR
`);
    const errs = validate(nodes);
    expect(errs.length).toBe(1);
  });

  test("correct enum value", async () => {
    const { nodes } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 @i1@ INDI
1 SEX M
0 TRLR
`);
    const errs = validate(nodes);
    expect(errs.length).toBe(0);
  });
});
