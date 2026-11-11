import type { ASTNode } from "@domorium/validator";

import type { Range } from "../../types";

const startLine = (node: ASTNode): number => node.range.start.line;

function lastStartingAtOrBefore(
  nodes: ASTNode[],
  line: number,
): ASTNode | undefined {
  let low = 0;
  let high = nodes.length - 1;
  let found: ASTNode | undefined;
  while (low <= high) {
    const middle = (low + high) >>> 1;
    if (startLine(nodes[middle]) <= line) {
      found = nodes[middle];
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found;
}

/**
 * One node is one line, and siblings are in document order, so the line is
 * found by halving each level. A continuation line stands for the structure it
 * continues.
 */
export function structureAt(
  roots: ASTNode[],
  line: number,
): ASTNode | undefined {
  let level = roots;
  for (;;) {
    const node = lastStartingAtOrBefore(level, line);
    if (!node) {
      return undefined;
    }
    if (startLine(node) === line) {
      const tag = node.tokens.TAG?.value;
      if (!tag || node.tokens.LEVEL === undefined) {
        return undefined;
      }
      return (tag === "CONT" || tag === "CONC") && node.parent
        ? node.parent
        : node;
    }
    level = node.children;
  }
}

// A parent's own range runs to the end of its subtree, so its line ends where its
// last token does.
export function lineRange(node: ASTNode): Range {
  let end = node.range.end;
  let endOffset = -1;
  for (const token of Object.values(node.tokens)) {
    if (token && token.endOffset > endOffset) {
      endOffset = token.endOffset;
      end = token.range.end;
    }
  }
  return { start: node.range.start, end };
}

export function subtreeEnd(node: ASTNode): ASTNode {
  let last = node;
  while (last.children.length > 0) {
    last = last.children[last.children.length - 1];
  }
  return last;
}

export function structurePath(node: ASTNode): string[] {
  const path: string[] = [];
  for (let step: ASTNode | undefined = node; step; step = step.parent) {
    path.unshift(step.tokens.TAG?.value ?? "");
  }
  return path;
}
