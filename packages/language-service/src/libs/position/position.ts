import type { ASTNode } from "@domorium/validator";
import type { Position, Range } from "../../types";

export const isPositionInRange = (position: Position, range: Range): boolean => {
  if (position.line < range.start.line || position.line > range.end.line) {
    return false;
  }
  if (
    position.line === range.start.line &&
    position.character < range.start.character
  ) {
    return false;
  }
  if (
    position.line === range.end.line &&
    position.character >= range.end.character
  ) {
    return false;
  }
  return true;
};

export const findNodeByTagAtPosition = (
  nodes: ASTNode[],
  position: Position,
): ASTNode | undefined => {
  for (const node of nodes) {
    const tag = node.tokens.TAG;
    if (tag && isPositionInRange(position, tag.range)) {
      return node;
    }
    const childMatch = findNodeByTagAtPosition(node.children, position);
    if (childMatch) {
      return childMatch;
    }
  }
  return undefined;
};
