import type { ASTNode, ASTToken, TokenNames } from "@domorium/validator";

const SemanticTokenTypes = {
  comment: "comment",
  keyword: "keyword",
  string: "string",
} as const;

const SemanticTokenModifiers = {
  declaration: "declaration",
} as const;

export interface SemanticToken {
  line: number;
  char: number;
  length: number;
  tokenType: number;
  tokenModifiers: number;
}

export const tokenTypes = [
  SemanticTokenTypes.comment,
  SemanticTokenTypes.keyword,
  SemanticTokenTypes.string,
] as const;

export const tokenModifiers = [SemanticTokenModifiers.declaration] as const;

export const legend = {
  tokenTypes: [...tokenTypes],
  tokenModifiers: [...tokenModifiers],
};

const tokenTypeMap = new Map(tokenTypes.map((t, i) => [t, i]));
const tokenModifierMap = new Map(tokenModifiers.map((m, i) => [m, i]));

const tokenMap: Partial<Record<TokenNames, (typeof tokenTypes)[number]>> = {
  LEVEL: SemanticTokenTypes.comment,
  POINTER: SemanticTokenTypes.keyword,
  XREF: SemanticTokenTypes.keyword,
  TAG: SemanticTokenTypes.string,
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
 * `range` is derived from the syntax tree's offsets on every access, so it is
 * read once and the length is taken from the offsets — which is also the only
 * correct length for a token that spans lines.
 */
const collect = (token: ASTToken, into: SemanticToken[]): void => {
  if (tokenMap[token.name] === undefined) {
    return;
  }

  const { start } = token.range;
  into.push({
    line: start.line,
    char: start.character,
    length: token.endOffset - token.startOffset,
    tokenType: tokenTypeIndex(token.name),
    tokenModifiers: modifierMask(token.name),
  });
};

const walk = (nodes: ASTNode[], into: SemanticToken[]): void => {
  for (const node of nodes) {
    for (const token of Object.values(node.tokens)) {
      collect(token, into);
    }
    walk(node.children, into);
  }
};

export function semanticTokens(nodes: ASTNode[]): SemanticToken[] {
  const tokens: SemanticToken[] = [];
  walk(nodes, tokens);
  return tokens;
}
