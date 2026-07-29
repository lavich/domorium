import type { Text } from "@codemirror/state";
import type { Position, Range } from "@gedcom/language-service";

export function toOffset(document: Text, position: Position): number {
  const lineNumber = Math.min(Math.max(position.line + 1, 1), document.lines);
  const line = document.line(lineNumber);
  return Math.min(line.from + Math.max(position.character, 0), line.to);
}

export function toPosition(document: Text, offset: number): Position {
  const clamped = Math.min(Math.max(offset, 0), document.length);
  const line = document.lineAt(clamped);
  return { line: line.number - 1, character: clamped - line.from };
}

export function toOffsets(document: Text, range: Range): { from: number; to: number } {
  return {
    from: toOffset(document, range.start),
    to: toOffset(document, range.end),
  };
}
