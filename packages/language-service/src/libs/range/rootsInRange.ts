import type { ASTNode } from "@domorium/validator";
import type { OffsetRange } from "../../types";

/**
 * The root records overlapping a span of the document.
 *
 * Records are level-0 structures in document order, and a record's
 * `endOffset` covers its whole subtree, so the first one that can overlap is
 * a binary search away and the rest follow it. Narrowing here rather than
 * filtering afterwards is the point: the walk is what costs, not the output.
 */
export function rootsInRange(
  roots: ASTNode[],
  range?: OffsetRange,
): ASTNode[] {
  if (!range) {
    return roots;
  }

  let low = 0;
  let high = roots.length - 1;
  let first = roots.length;
  while (low <= high) {
    const middle = (low + high) >>> 1;
    if (roots[middle].endOffset > range.from) {
      first = middle;
      high = middle - 1;
    } else {
      low = middle + 1;
    }
  }

  const overlapping: ASTNode[] = [];
  for (
    let index = first;
    index < roots.length && roots[index].startOffset < range.to;
    index += 1
  ) {
    overlapping.push(roots[index]);
  }
  return overlapping;
}
