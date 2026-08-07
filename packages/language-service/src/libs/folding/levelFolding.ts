import type { ASTNode } from "@domorium/validator";
import type { FoldingRange } from "../../types";

/**
 * `range` is derived from the syntax tree's offsets on access, so it is read
 * once per node rather than twice, and the walk pushes into one array instead
 * of building one per node. See the note on ASTNode.
 */
export const levelFolding = (nodes: ASTNode[]): FoldingRange[] => {
  const ranges: FoldingRange[] = [];
  walk(nodes, ranges);
  return ranges;
};

const walk = (nodes: ASTNode[], into: FoldingRange[]): void => {
  for (const node of nodes) {
    if (node.children.length === 0) {
      continue;
    }
    const { start, end } = node.range;
    into.push({ startLine: start.line, endLine: end.line });
    walk(node.children, into);
  }
};
