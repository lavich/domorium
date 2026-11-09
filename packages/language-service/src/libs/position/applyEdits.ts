import type { Position, TextEdit } from "../../types";
import { LINE_TERMINATOR } from "./lineTerminators";

export interface OffsetEdit {
  start: number;
  end: number;
  newText: string;
}

export function offsetEdits(text: string, edits: TextEdit[]): OffsetEdit[] {
  const starts = lineStarts(text);
  const offsetOf = ({ line, character }: Position) =>
    Math.min((starts[line] ?? text.length) + character, text.length);
  return edits
    .map((edit) => ({
      start: offsetOf(edit.range.start),
      end: offsetOf(edit.range.end),
      newText: edit.newText,
    }))
    .sort((left, right) => left.start - right.start);
}

export function applyEdits(text: string, edits: TextEdit[]): string {
  let result = "";
  let cursor = 0;
  for (const { start, end, newText } of offsetEdits(text, edits)) {
    result += text.slice(cursor, start) + newText;
    cursor = end;
  }
  return result + text.slice(cursor);
}

export function lineStarts(text: string): number[] {
  const starts = [0];
  const terminator = new RegExp(LINE_TERMINATOR.source, "gu");
  for (const match of text.matchAll(terminator)) {
    starts.push(match.index + match[0].length);
  }
  return starts;
}
