import type { InlayHint } from "vscode-languageserver-protocol";

import { ASTNode } from "@domorium/validator";

const INDENT = "  ";

export const levelIndent = (nodes: ASTNode[]): InlayHint[] => {
  return nodes.flatMap((node) => {
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
