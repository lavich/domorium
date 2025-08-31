import { CstNode } from "chevrotain";
import { CstElement, IToken } from "@chevrotain/types";
import { GedcomParser } from "./parser";
import { gedcomLexerDefinition, TokenNames } from "./lexer";

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
  range: Range;
  value: string;
}

export interface ASTNode {
  range: Range;
  tokens: Partial<Record<TokenNames, ASTToken>>;
  parent?: ASTNode;
  children: ASTNode[];
  level: number;
}

export interface VisitorResult {
  nodes: ASTNode[];
  pointers: Map<string, ASTToken[]>;
  xrefs: Map<string, ASTToken[]>;
}

const isCstNode = (v: CstElement): v is CstNode => "name" in v;
const isIToken = (v: CstElement): v is IToken => "image" in v;

export class GedcomVisitor extends BaseGedcomVisitor {
  constructor() {
    super();
    this.validateVisitor();
  }

  root(ctx: CstNode): VisitorResult {
    const nodes: ASTNode[] = [];
    if (!ctx.children.line) {
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

    let start: Position | undefined;
    let end: Position | undefined;

    for (const [tokenName, elements] of Object.entries(children)) {
      const tokenList = this.getTokens(elements);
      for (const token of tokenList) {
        if (!start || !end) {
          start = { ...token.range.start };
          end = { ...token.range.end };
        } else {
          start.line = Math.min(start.line, token.range.start.line);
          start.character = Math.min(
            start.character,
            token.range.start.character,
          );
          end.line = Math.max(end.line, token.range.end.line);
          end.character = Math.max(end.character, token.range.end.character);
        }
        // last token wins for this name
        tokens[tokenName as TokenNames] = token;
      }
    }

    const levelValue = tokens.LEVEL?.value;
    const level =
      levelValue && /^\d+$/.test(levelValue) ? parseInt(levelValue, 10) : 0;

    return {
      level,
      range: {
        start: start ?? { line: 0, character: 0 },
        end: end ?? { line: 0, character: 0 },
      },
      tokens,
      children: [],
    };
  }

  getTokens(elements?: CstElement[]): ASTToken[] {
    if (!elements) {
      return [];
    }
    const tokens: ASTToken[] = [];
    for (const el of elements) {
      if (isIToken(el)) {
        tokens.push({
          name: el.tokenType.name as TokenNames,
          value: el.image,
          range: {
            start: { line: el.startLine ?? 0, character: el.startColumn ?? 0 },
            end: { line: el.endLine ?? 0, character: 1 + (el.endColumn ?? 0) },
          },
        });
      }
    }
    return tokens;
  }

  buildHierarchy(nodes: ASTNode[]): VisitorResult {
    const stack: ASTNode[] = [];
    const result: ASTNode[] = [];
    const pointers = new Map<string, ASTToken[]>();
    const xrefs = new Map<string, ASTToken[]>();

    for (const node of nodes) {
      if (node.parent === node) {
        throw new Error("AST cycle detected");
      }
      if (node.tokens.POINTER?.value) {
        const mapArr = pointers.get(node.tokens.POINTER.value) || [];
        mapArr.push(node.tokens.POINTER);
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
        while (current) {
          if (
            node.range.end.line > current.range.end.line ||
            (node.range.end.line === current.range.end.line &&
              node.range.end.character > current.range.end.character)
          ) {
            current.range.end = { ...node.range.end };
          }
          current = current.parent;
        }
      }

      stack.push(node);
    }

    return { nodes: result, pointers, xrefs };
  }
}
