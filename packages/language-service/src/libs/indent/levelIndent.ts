import { ASTNode } from "@domorium/validator";
import type { InlayHint, OffsetRange } from "../../types";
import { rootsInRange } from "../range/rootsInRange";

const INDENT = "  ";

export const levelIndent = (
  nodes: ASTNode[],
  range?: OffsetRange,
): InlayHint[] => {
  return rootsInRange(nodes, range).flatMap((node) => {
    const hint = levelIndent(node.children);
    if (node.level > 0) {
      const indent = INDENT.repeat(node.level);
      hint.push({
        position: {
          line: node.range.start.line,
          character: 0,
        },
        label: indent,
        paddingRight: true,
      });
    }
    return hint;
  });
};
