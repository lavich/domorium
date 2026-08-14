import type { ASTNode } from "@domorium/validator";
import { DocumentSymbolKind, type DocumentSymbol } from "../../types";
import { recordLabel } from "./recordLabel";

// A record is named by the identifier other records point at, and a shared
// note declares one and carries a payload besides.
function symbolDetail(node: ASTNode): string | undefined {
  const { VALUE, XREF, POINTER } = node.tokens;
  return node.level === 0
    ? (XREF?.value ?? POINTER?.value ?? VALUE?.value)
    : (VALUE?.value ?? XREF?.value ?? POINTER?.value);
}

export const documentSymbols = (nodes: ASTNode[]): DocumentSymbol[] => {
  return nodes.map((node) => {
    const tag = node.tokens.TAG?.value ?? "";
    const detail = symbolDetail(node);
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
