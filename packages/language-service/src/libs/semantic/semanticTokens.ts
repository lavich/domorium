import type { ASTNode, ASTToken, TokenNames } from "gedcom-validator";

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
  const idx = semanticType === undefined ? undefined : tokenTypeMap.get(semanticType);
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

const tokenToSemanticToken = (token: ASTToken): SemanticToken | undefined => {
  if (tokenMap[token.name] === undefined) return undefined;

  return {
    line: token.range.start.line,
    char: token.range.start.character,
    length: token.range.end.character - token.range.start.character,
    tokenType: tokenTypeIndex(token.name),
    tokenModifiers: modifierMask(token.name),
  };
};

export function semanticTokens(nodes: ASTNode[]): SemanticToken[] {
  return nodes.flatMap((node) => {
    return [
      ...Object.values(node.tokens)
        .map(tokenToSemanticToken)
        .filter((token): token is SemanticToken => token !== undefined),
      ...semanticTokens(node.children),
    ];
  });
}
