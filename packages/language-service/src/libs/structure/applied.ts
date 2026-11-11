import type { TextEdit } from "../../types";
import { applyEdits, lineStarts, offsetEdits } from "../position/applyEdits";

export interface Applied {
  text: string;
  writtenLines: Set<number>;
  lineDelta: number;
}

function lineOf(starts: number[], offset: number): number {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const middle = (low + high + 1) >>> 1;
    if (starts[middle] <= offset) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }
  return low;
}

export function applied(text: string, edits: TextEdit[]): Applied {
  const result = applyEdits(text, edits);
  const spans: [number, number][] = [];
  let delta = 0;
  for (const { start, end, newText } of offsetEdits(text, edits)) {
    if (newText.length > 0) {
      spans.push([start + delta, start + delta + newText.length]);
    }
    delta += newText.length - (end - start);
  }
  const resultStarts = lineStarts(result);
  const writtenLines = new Set<number>();
  for (const [from, to] of spans) {
    const last = lineOf(resultStarts, Math.max(from, to - 1));
    for (let line = lineOf(resultStarts, from); line <= last; line++) {
      writtenLines.add(line);
    }
  }
  return {
    text: result,
    writtenLines,
    lineDelta: resultStarts.length - lineStarts(text).length,
  };
}
