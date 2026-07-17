import { SemanticTokenModifiers, SemanticTokenTypes } from "vscode-languageserver";
import type { ASTNode, ASTToken, TokenNames } from "@domorium/validator";

interface SemanticToken {
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
  SemanticTokenTypes.variable,
] as const;

export const tokenModifiers = [SemanticTokenModifiers.declaration] as const;

export const legend = {
  tokenTypes: [...tokenTypes],
  tokenModifiers: [...tokenModifiers],
};

const tokenTypeMap = new Map(tokenTypes.map((t, i) => [t, i]));
const tokenModifierMap = new Map(tokenModifiers.map((m, i) => [m, i]));

const tokenMap: Record<TokenNames, (typeof tokenTypes)[number]> = {
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
  const idx = tokenTypeMap.get(tokenMap[kind]);
  if (idx === undefined) {
    throw new Error(`Unknown token type: ${tokenMap[kind]}`);
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

const tokenToSemanticToken = (token: ASTToken): SemanticToken => ({
  line: token.range.start.line,
  char: token.range.start.character,
  length: token.range.end.character - token.range.start.character,
  tokenType: tokenTypeIndex(token.name),
  tokenModifiers: modifierMask(token.name),
});

export function semanticTokens(nodes: ASTNode[]): SemanticToken[] {
  return nodes.flatMap((node) => {
    return [
      ...Object.values(node.tokens).map(tokenToSemanticToken),
      ...semanticTokens(node.children),
    ];
  });
}
