import type { IToken } from "@chevrotain/types";
import { TokenNames } from "./lexer";
import { createLineIndex, offsetToPosition, type LineIndex } from "./lineIndex";

interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface ASTToken {
  name: TokenNames;
  /** Character offset of the first character. */
  startOffset: number;
  /** Character offset just past the last character. */
  endOffset: number;
  /** Derived from the offsets; see the note on ASTNode. */
  readonly range: Range;
  value: string;
}

export interface ASTNode {
  startOffset: number;
  endOffset: number;
  /**
   * Line and character are computed on access rather than stored. A large
   * document has millions of tokens, and a stored range costs three objects
   * apiece — that alone was most of the syntax tree's memory. Reading `range`
   * in a tight loop allocates; prefer the offsets there.
   */
  readonly range: Range;
  tokens: Partial<Record<TokenNames, ASTToken>>;
  parent?: ASTNode;
  children: ASTNode[];
  level: number;
}

class Token implements ASTToken {
  constructor(
    readonly name: TokenNames,
    readonly value: string,
    readonly startOffset: number,
    readonly endOffset: number,
    private readonly lines: LineIndex,
  ) {}

  get range(): Range {
    return {
      start: offsetToPosition(this.lines, this.startOffset),
      end: offsetToPosition(this.lines, this.endOffset),
    };
  }
}

class Node implements ASTNode {
  parent?: ASTNode;
  readonly children: ASTNode[] = [];

  constructor(
    readonly level: number,
    public startOffset: number,
    public endOffset: number,
    readonly tokens: Partial<Record<TokenNames, ASTToken>>,
    private readonly lines: LineIndex,
  ) {}

  get range(): Range {
    return {
      start: offsetToPosition(this.lines, this.startOffset),
      end: offsetToPosition(this.lines, this.endOffset),
    };
  }
}

export interface AstResult {
  nodes: ASTNode[];
  pointers: Map<string, ASTNode[]>;
  xrefs: Map<string, ASTToken[]>;
  /** Lines that carry no level, which GEDCOM requires on every line. */
  malformed: ASTNode[];
}

/**
 * Resolves a node's logical value by following CONT (new line) and CONC
 * (concatenation) continuation children in document order, per the GEDCOM
 * line-continuation rules.
 */
export function resolveValue(node: ASTNode): string {
  let value = node.tokens.VALUE?.value ?? "";
  for (const child of node.children) {
    const tag = child.tokens.TAG?.value;
    if (tag === "CONT") {
      value += "\n" + (child.tokens.VALUE?.value ?? "");
    } else if (tag === "CONC") {
      value += child.tokens.VALUE?.value ?? "";
    }
  }
  return value;
}

/**
 * Builds the syntax tree straight from the token stream.
 *
 * There is no grammar to speak of: a GEDCOM line is
 * `level [@xref@] TAG [value]`, and the lexer's modes already decide which is
 * which. A parse tree in between was a second pass over 2.8 million tokens
 * for a 15.6 MB document, and building the real tree from it a third — 543 ms
 * and much of another 828 ms, to add nothing the tokens did not already say.
 *
 * Lines are found by offset against the line index rather than by looking for
 * a level, so a line that has no level still becomes a node and is reported,
 * instead of ending the parse and taking the rest of the document with it.
 */
export function buildAst(tokens: IToken[], text: string): AstResult {
  const lines = createLineIndex(text);
  const nodes: ASTNode[] = [];
  const malformed: ASTNode[] = [];

  // Tokens come in ascending offset order, so the line they belong to is
  // found by walking the index forward rather than searching it per token.
  let line = 0;
  const lineOf = (offset: number): number => {
    while (line + 1 < lines.length && offset >= lines[line + 1]) {
      line += 1;
    }
    return line;
  };

  let index = 0;
  while (index < tokens.length) {
    const lineNumber = lineOf(tokens[index].startOffset);
    const lineTokens: Partial<Record<TokenNames, ASTToken>> = {};
    const start = tokens[index].startOffset;
    let end = start;

    while (
      index < tokens.length &&
      lineOf(tokens[index].startOffset) === lineNumber
    ) {
      const token = tokens[index];
      const endOffset = (token.endOffset ?? token.startOffset) + 1;
      // Last token of a name wins, as the parse tree's did.
      lineTokens[token.tokenType.name as TokenNames] = new Token(
        token.tokenType.name as TokenNames,
        token.image,
        token.startOffset,
        endOffset,
        lines,
      );
      if (endOffset > end) {
        end = endOffset;
      }
      index += 1;
    }

    const levelValue = lineTokens.LEVEL?.value;
    const node = new Node(
      levelValue !== undefined ? parseInt(levelValue, 10) : 0,
      start,
      end,
      lineTokens,
      lines,
    );
    nodes.push(node);
    if (levelValue === undefined) {
      malformed.push(node);
    }
  }

  return buildHierarchy(nodes, malformed);
}

function buildHierarchy(nodes: ASTNode[], malformed: ASTNode[]): AstResult {
  const stack: ASTNode[] = [];
  const result: ASTNode[] = [];
  const pointers = new Map<string, ASTNode[]>();
  const xrefs = new Map<string, ASTToken[]>();

  for (const node of nodes) {
    const pointer = node.tokens.POINTER?.value;
    if (pointer) {
      const existing = pointers.get(pointer);
      if (existing) {
        existing.push(node);
      } else {
        pointers.set(pointer, [node]);
      }
    }
    const xref = node.tokens.XREF;
    if (xref?.value) {
      const existing = xrefs.get(xref.value);
      if (existing) {
        existing.push(xref);
      } else {
        xrefs.set(xref.value, [xref]);
      }
    }

    while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      result.push(node);
    } else {
      const parent = stack[stack.length - 1];
      parent.children.push(node);
      node.parent = parent;

      let current: ASTNode | undefined = parent;
      while (current && node.endOffset > current.endOffset) {
        current.endOffset = node.endOffset;
        current = current.parent;
      }
    }

    stack.push(node);
  }

  return { nodes: result, pointers, xrefs, malformed };
}
