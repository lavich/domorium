import { CstNode } from "chevrotain";
import { CstElement, IToken } from "@chevrotain/types";
import { GedcomParser } from "./parser";
import { gedcomLexerDefinition, TokenNames } from "./lexer";
import { createLineIndex, offsetToPosition, type LineIndex } from "./lineIndex";

const parser = new GedcomParser(gedcomLexerDefinition);
const BaseGedcomVisitor = parser.getBaseCstVisitorConstructor();

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

export interface VisitorResult {
  nodes: ASTNode[];
  pointers: Map<string, ASTNode[]>;
  xrefs: Map<string, ASTToken[]>;
}

const isCstNode = (v: CstElement): v is CstNode => "name" in v;
const isIToken = (v: CstElement): v is IToken => "image" in v;

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

export class GedcomVisitor extends BaseGedcomVisitor {
  private readonly lines: LineIndex;

  constructor(text = "") {
    super();
    this.lines = createLineIndex(text);
    this.validateVisitor();
  }

  root(ctx: CstNode | undefined): VisitorResult {
    const nodes: ASTNode[] = [];
    if (!ctx?.children.line) {
      return { nodes, xrefs: new Map(), pointers: new Map() };
    }

    ctx.children.line.forEach((lineCst) => {
      if (isCstNode(lineCst)) {
        nodes.push(this.line(lineCst));
      }
    });

    return this.buildHierarchy(nodes);
  }

  line({ children }: CstNode): ASTNode {
    const tokens: ASTNode["tokens"] = {};

    let start = Infinity;
    let end = -Infinity;

    for (const [tokenName, elements] of Object.entries(children)) {
      const tokenList = this.getTokens(elements);
      for (const token of tokenList) {
        start = Math.min(start, token.startOffset);
        end = Math.max(end, token.endOffset);
        // last token wins for this name
        tokens[tokenName as TokenNames] = token;
      }
    }

    const levelValue = tokens.LEVEL?.value;
    const level =
      levelValue && /^\d+$/.test(levelValue) ? parseInt(levelValue, 10) : 0;

    return new Node(
      level,
      Number.isFinite(start) ? start : 0,
      Number.isFinite(end) ? end : 0,
      tokens,
      this.lines,
    );
  }

  getTokens(elements?: CstElement[]): ASTToken[] {
    if (!elements) {
      return [];
    }
    const tokens: ASTToken[] = [];
    for (const el of elements) {
      if (isIToken(el)) {
        tokens.push(
          new Token(
            el.tokenType.name as TokenNames,
            el.image,
            el.startOffset,
            (el.endOffset ?? el.startOffset) + 1,
            this.lines,
          ),
        );
      }
    }
    return tokens;
  }

  buildHierarchy(nodes: ASTNode[]): VisitorResult {
    const stack: ASTNode[] = [];
    const result: ASTNode[] = [];
    const pointers = new Map<string, ASTNode[]>();
    const xrefs = new Map<string, ASTToken[]>();

    for (const node of nodes) {
      if (node.parent === node) {
        throw new Error("AST cycle detected");
      }
      if (node.tokens.POINTER?.value) {
        const mapArr = pointers.get(node.tokens.POINTER.value) || [];
        mapArr.push(node);
        pointers.set(node.tokens.POINTER.value, mapArr);
      }
      if (node.tokens.XREF?.value) {
        const mapArr = xrefs.get(node.tokens.XREF.value) || [];
        mapArr.push(node.tokens.XREF);
        xrefs.set(node.tokens.XREF.value, mapArr);
      }

      while (stack.length > 0 && (stack.at(-1)?.level ?? 0) >= node.level) {
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

    return { nodes: result, pointers, xrefs };
  }
}
