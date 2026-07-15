import type { ASTNode, GedcomDocument } from "@domorium/validator";
import type { Hover, Position } from "vscode-languageserver";
import { findNodeByTagAtPosition } from "../position/position";

export const getHover = (
  document: GedcomDocument,
  nodes: ASTNode[],
  position: Position,
): Hover | null => {
  const node = findNodeByTagAtPosition(nodes, position);
  const tag = node?.tokens.TAG;
  if (!node || !tag) {
    return null;
  }
  const label = document.getLabel(node);
  if (!label) {
    return null;
  }
  return {
    contents: {
      kind: "markdown",
      value: `**${tag.value}** — ${label}`,
    },
    range: tag.range,
  };
};
