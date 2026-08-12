import type { ASTNode } from "@domorium/validator";
import { DocumentSymbolKind, type DocumentSymbol } from "../../types";
import { recordLabel } from "./recordLabel";

export const documentSymbols = (nodes: ASTNode[]): DocumentSymbol[] => {
  return nodes.map((node) => {
    const tag = node.tokens.TAG?.value ?? "";
    const detail =
      node.tokens.VALUE?.value ??
      node.tokens.XREF?.value ??
      node.tokens.POINTER?.value;
    const label = node.level === 0 ? recordLabel(node) : undefined;

    return {
      name: tag,
      detail,
      ...(label === undefined ? {} : { label }),
      kind:
        node.level === 0 ? DocumentSymbolKind.Object : DocumentSymbolKind.Field,
      range: node.range,
      selectionRange: node.tokens.TAG?.range ?? node.range,
      children: documentSymbols(node.children),
    };
  });
};
