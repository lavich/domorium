import type { ASTNode, ASTToken } from "@domorium/validator";
import type { Position, Range } from "../../types";
import { isPositionInRange } from "../position/position";

const findXrefAtPosition = (
  nodes: ASTNode[],
  position: Position,
): ASTToken | undefined => {
  for (const node of nodes) {
    const xref = node.tokens.XREF;
    if (xref && isPositionInRange(position, xref.range)) {
      return xref;
    }
    const childMatch = findXrefAtPosition(node.children, position);
    if (childMatch) {
      return childMatch;
    }
  }
  return undefined;
};

export const findDefinitionRanges = (
  nodes: ASTNode[],
  pointers: Map<string, ASTNode[]>,
  position: Position,
): Range[] => {
  const xref = findXrefAtPosition(nodes, position);
  if (!xref) {
    return [];
  }
  const targets = pointers.get(xref.value) ?? [];
  return targets
    .map((node) => node.tokens.POINTER?.range)
    .filter((range): range is Range => !!range);
};
