import type { ASTNode } from "gedcom-validator";
import { DocumentSymbolKind, type DocumentSymbol } from "../../types";

export const documentSymbols = (nodes: ASTNode[]): DocumentSymbol[] => {
  return nodes.map((node) => {
    const tag = node.tokens.TAG?.value ?? "";
    const detail =
      node.tokens.VALUE?.value ??
      node.tokens.XREF?.value ??
      node.tokens.POINTER?.value;

    return {
      name: tag,
      detail,
      kind:
        node.level === 0
          ? DocumentSymbolKind.Object
          : DocumentSymbolKind.Field,
      range: node.range,
      selectionRange: node.tokens.TAG?.range ?? node.range,
      children: documentSymbols(node.children),
    };
  });
};
