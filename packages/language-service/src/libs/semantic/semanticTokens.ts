import type { ASTNode, ASTToken, TokenNames } from "@domorium/validator";
import type { OffsetRange, Position } from "../../types";
import { rootsInRange } from "../range/rootsInRange";

const SemanticTokenTypes = {
  comment: "comment",
  keyword: "keyword",
  variable: "variable",
  string: "string",
} as const;

const SemanticTokenModifiers = {
  declaration: "declaration",
} as const;

export interface SemanticToken {
  /** Character offset of the first character. */
  startOffset: number;
  /** Character offset just past the last character. */
  endOffset: number;
  length: number;
  /** Derived from the offsets on access; see the note on Token below. */
  line: number;
  /** Derived from the offsets on access; see the note on Token below. */
  char: number;
  tokenType: number;
  tokenModifiers: number;
}

export const tokenTypes = [
  SemanticTokenTypes.comment,
  SemanticTokenTypes.keyword,
  SemanticTokenTypes.variable,
  SemanticTokenTypes.string,
] as const;

export const tokenModifiers = [SemanticTokenModifiers.declaration] as const;

export const legend = {
  tokenTypes: [...tokenTypes],
  tokenModifiers: [...tokenModifiers],
};

const tokenTypeMap = new Map(tokenTypes.map((t, i) => [t, i]));
const tokenModifierMap = new Map(tokenModifiers.map((m, i) => [m, i]));

// A tag is the keyword of its line, an identifier a variable and a payload the
// value, which is what a host's theme already holds a colour for. The level is a
// comment for want of a truer name: it is structure, not content.
const tokenMap: Partial<Record<TokenNames, (typeof tokenTypes)[number]>> = {
  LEVEL: SemanticTokenTypes.comment,
  POINTER: SemanticTokenTypes.variable,
  XREF: SemanticTokenTypes.variable,
  TAG: SemanticTokenTypes.keyword,
  VALUE: SemanticTokenTypes.string,
};

const tokenModifiersMap: Record<TokenNames, (typeof tokenModifiers)[number][]> =
  {
    LEVEL: [],
    POINTER: [SemanticTokenModifiers.declaration],
    XREF: [],
    TAG: [],
    VALUE: [],
  };

export function tokenTypeIndex(kind: TokenNames): number {
  const semanticType = tokenMap[kind];
  const idx =
    semanticType === undefined ? undefined : tokenTypeMap.get(semanticType);
  if (idx === undefined) {
    throw new Error(`No semantic token type for: ${kind}`);
  }
  return idx;
}

export function modifierMask(kind: TokenNames): number {
  let mask = 0;
  for (const m of tokenModifiersMap[kind]) {
    const idx = tokenModifierMap.get(m);
    if (idx !== undefined) {
      mask |= 1 << idx;
    }
  }
  return mask;
}

/**
 * Carries the offsets it was built from and derives a line and character only
 * if asked.
 *
 * The syntax tree stores offsets; the CodeMirror hosts address everything by
 * offset; only the LSP hosts need a line and character, because that is how
 * the protocol's delta encoding is defined. Deriving one for every token so
 * that an adapter could convert it straight back cost 387 ms on a 15.6 MB
 * document, on top of the derivation itself.
 */
class Token implements SemanticToken {
  private start: Position | undefined;

  constructor(
    private readonly token: ASTToken,
    readonly tokenType: number,
    readonly tokenModifiers: number,
  ) {}

  get startOffset(): number {
    return this.token.startOffset;
  }

  get endOffset(): number {
    return this.token.endOffset;
  }

  /** From the offsets, so it is right for a token spanning lines too. */
  get length(): number {
    return this.token.endOffset - this.token.startOffset;
  }

  get line(): number {
    return this.position().line;
  }

  get char(): number {
    return this.position().character;
  }

  private position(): Position {
    return (this.start ??= this.token.range.start);
  }
}

const collect = (token: ASTToken, into: SemanticToken[]): void => {
  if (tokenMap[token.name] === undefined) {
    return;
  }
  into.push(
    new Token(token, tokenTypeIndex(token.name), modifierMask(token.name)),
  );
};

const walk = (nodes: ASTNode[], into: SemanticToken[]): void => {
  for (const node of nodes) {
    for (const token of Object.values(node.tokens)) {
      collect(token, into);
    }
    walk(node.children, into);
  }
};

export function semanticTokens(
  nodes: ASTNode[],
  range?: OffsetRange,
): SemanticToken[] {
  const tokens: SemanticToken[] = [];
  walk(rootsInRange(nodes, range), tokens);
  return tokens;
}
