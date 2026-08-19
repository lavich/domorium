import type { ReferenceIndex } from "../references/referenceIndex";
import { LINE_TERMINATOR } from "../position/lineTerminators";
import type { Position, RecordPreview } from "../../types";

export interface RecordPreviewInput {
  index: ReferenceIndex;
  text: string;
  foldEndLine: (startLine: number) => number | undefined;
}

export const recordPreview = (
  { index, text, foldEndLine }: RecordPreviewInput,
  position: Position,
  maxLines: number,
): RecordPreview | null => {
  const occurrence = index.at(position);
  if (!occurrence) {
    return null;
  }
  const [declaration] = index.get(occurrence.id)?.declarations ?? [];
  if (!declaration || declaration.range.start.line === position.line) {
    return null;
  }
  const startLine = declaration.range.start.line;
  const endLine = foldEndLine(startLine) ?? startLine;
  const lastLine = Math.min(endLine, startLine + maxLines - 1);
  return {
    range: {
      start: { line: startLine, character: 0 },
      end: { line: lastLine, character: lineLength(text, lastLine) },
    },
    pointer: occurrence.range,
    truncated: endLine > lastLine,
  };
};

/** lines(text)[line] would split a whole document to measure one line. */
const lineLength = (text: string, line: number): number =>
  (text.split(LINE_TERMINATOR, line + 1)[line] ?? "").length;
