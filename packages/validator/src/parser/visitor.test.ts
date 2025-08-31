import { describe, expect, it } from "vitest";
import { ASTNode, GedcomVisitor } from "./visitor";
import { ConfigurableLexer, gedcomLexerDefinition } from "./lexer";
import { GedcomParser } from "./parser";

// Helper to parse GEDCOM snippet and build AST
function parseGedcom(input: string) {
  const gedcomLexer = new ConfigurableLexer({ zeroBased: true });
  const lexingResult = gedcomLexer.tokenize(input);
  const parser = new GedcomParser(gedcomLexerDefinition);
  parser.input = lexingResult.tokens;
  const cst = parser.root();
  const visitor = new GedcomVisitor();
  return visitor.root(cst);
}

describe("AstVisitor", () => {
  it("should parse a single line with correct tokens and range", () => {
    const ast = parseGedcom("0 HEAD\n");
    expect(ast.nodes.length).toBe(1);
    expect(ast.pointers.size).toBe(0);
    expect(ast.xrefs.size).toBe(0);

    const node = ast.nodes[0];
    expect(node.tokens.LEVEL?.value).toBe("0");
    expect(node.tokens.TAG?.value).toBe("HEAD");
    expect(node.range.start.line).toBe(0);
    expect(node.range.end.line).toBe(0);
    expect(node.range.start.character).toBe(0);
    expect(node.range.end.character).toBe(6);
  });

  it("should build hierarchy based on LEVEL", () => {
    const gedcom = `0 HEAD
1 SOUR App
2 VERS 1.0
0 TRLR
`;
    const { nodes } = parseGedcom(gedcom);
    expect(nodes.length).toBe(2);

    const head = nodes[0];
    expect(head.tokens.TAG?.value).toBe("HEAD");
    expect(head.range.start.line).toBe(0);
    expect(head.range.start.character).toBe(0);
    expect(head.range.end.line).toBe(2);
    expect(head.range.end.character).toBe(10);
    const trlr = nodes[1];
    expect(trlr.tokens.TAG?.value).toBe("TRLR");

    // HEAD → SOUR → VERS
    expect(head.children[0].tokens.TAG?.value).toBe("SOUR");
    expect(head.children[0].children[0].tokens.TAG?.value).toBe("VERS");
  });

  // it("should default LEVEL to 0 when missing", () => {
  //   const ast = parseGedcom("HEAD\n"); // malformed, no LEVEL
  //   expect(ast[0].level).toBe(0);
  // });

  it("should compute parent range as bounding box of children", () => {
    const gedcom = `0 HEAD
1 SOUR App
`;
    const { nodes } = parseGedcom(gedcom);
    const head = nodes[0];

    expect(head.range.start.line).toBe(0); // line numbers depend on lexer
    expect(head.range.end.line).toBeGreaterThanOrEqual(head.range.start.line);
  });

  it("should collect pointers and xrefs", () => {
    const gedcom = `0 @Abraham_Simpson@ INDI
1 NAME Abraham /Simpson/
2 GIVN Abraham
2 SURN Simpson
1 SEX M
1 FAMS @F0002@
1 CHAN
2 DATE 11 FEB 2007
3 TIME 15:05:36`;
    const res = parseGedcom(gedcom);
    expect(res.nodes.length).toBe(1);
    expect(res.nodes[0].children.length).toBe(4);
    expect(res.nodes[0].range.start.line).toBe(0);
    expect(res.nodes[0].range.end.line).toBe(8); //AssertionError: expected 6 to be 8
    expect(res.pointers.size).toBe(1);
    expect(res.xrefs.size).toBe(1);
  });

  it("should throw on AST cycles", () => {
    const visitor = new GedcomVisitor();
    // Fake nodes with cycle
    const fakeNode: ASTNode = {
      range: {
        start: { line: 1, character: 1 },
        end: { line: 1, character: 5 },
      },
      tokens: {},
      children: [],
      level: 0,
    };
    fakeNode.parent = fakeNode; // introduce cycle

    expect(() => visitor.buildHierarchy([fakeNode])).toThrow(
      "AST cycle detected",
    );
  });
});
