import type { Position } from "../types/position";

/**
 * Offsets at which each line of a document starts. Storing one number per line
 * lets the syntax tree keep character offsets instead of a line/character pair
 * per token, which is where most of a large document's memory went.
 */
export type LineIndex = Int32Array;

export function createLineIndex(text: string): LineIndex {
  const starts: number[] = [0];
  for (let i = 0; i < text.length; i += 1) {
    if (text.charCodeAt(i) === 10) {
      starts.push(i + 1);
    }
  }
  return Int32Array.from(starts);
}

export function offsetToPosition(index: LineIndex, offset: number): Position {
  let low = 0;
  let high = index.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (index[mid] <= offset) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  return { line: low, character: offset - index[low] };
}
