import type {
  CodeAction,
  Diagnostic,
  DocumentVersion,
  TextEdit,
} from "../../types";
import { endOfText, terminatorOf } from "../position/lineTerminators";

const HEADER = ["0 HEAD", "1 GEDC", "2 VERS 7.0"];
const TRAILER = "0 TRLR";

export function headerEdit(text: string): TextEdit {
  const newline = terminatorOf(text);
  const start = { line: 0, character: 0 };
  return {
    range: { start, end: start },
    newText: HEADER.map((line) => line + newline).join(""),
  };
}

export function trailerEdit(text: string): TextEdit {
  const newline = terminatorOf(text);
  const end = endOfText(text);
  const endsLine = end.character === 0;
  return {
    range: { start: end, end },
    newText: `${endsLine ? "" : newline}${TRAILER}${newline}`,
  };
}

export function headerAction(
  text: string,
  version: DocumentVersion,
  diagnostic: Diagnostic,
): CodeAction[] {
  return [
    {
      title: "Add a GEDCOM 7.0 header",
      kind: "quickfix",
      diagnostics: [diagnostic],
      edit: { version, edits: [headerEdit(text)] },
    },
  ];
}

export function trailerAction(
  text: string,
  version: DocumentVersion,
  diagnostic: Diagnostic,
): CodeAction[] {
  return [
    {
      title: "Add trailer",
      kind: "quickfix",
      diagnostics: [diagnostic],
      edit: { version, edits: [trailerEdit(text)] },
    },
  ];
}
