import type { ASTNode, ASTToken } from "@domorium/validator";
import type { Position, Range } from "vscode-languageserver";

const isPositionInRange = (position: Position, range: Range): boolean => {
  if (
    position.line < range.start.line ||
    position.line > range.end.line
  ) {
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
    position.character > range.end.character
  ) {
    return false;
  }
  return true;
};

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
