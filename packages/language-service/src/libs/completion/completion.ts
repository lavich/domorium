import type { GedcomCompletion, GedcomDocument } from "@domorium/validator";
import {
  CompletionItemKind,
  type CompletionItem,
  type Position,
  type Range,
} from "../../types";

const kinds: Record<GedcomCompletion["kind"], CompletionItemKind> = {
  tag: CompletionItemKind.Field,
  enum: CompletionItemKind.EnumMember,
  pointer: CompletionItemKind.Reference,
};

// One 5.5.1 calendar is named `FRENCH R`, so an escape is read before the line
// is split at whitespace — but only one space and one letter of it, or
// `@#DJ AND @#DGREGORIAN@` would read as one escape.
const ESCAPE = /@#D[A-Z]+(?: [A-Z])?@/gu;
const OPEN_ESCAPE = /@#D?[A-Z]*(?: [A-Z]?)?$/u;
const ESCAPE_TAIL = /^[A-Z]*(?: [A-Z])?@/u;
const SEPARATOR = /[\s,]/u;

function tokenAround(
  lineText: string,
  cursor: number,
): { start: number; end: number } {
  const character = Math.min(cursor, lineText.length);
  for (const match of lineText.matchAll(ESCAPE)) {
    const end = match.index + match[0].length;
    if (match.index <= character && character <= end) {
      return { start: match.index, end };
    }
  }
  const before = lineText.slice(0, character);
  const open = OPEN_ESCAPE.exec(before);
  if (open) {
    const tail = ESCAPE_TAIL.exec(lineText.slice(character));
    return {
      start: open.index,
      end: character + (tail ? tail[0].length : 0),
    };
  }
  let start = character;
  while (start > 0 && !SEPARATOR.test(lineText[start - 1])) {
    start -= 1;
  }
  let end = character;
  while (end < lineText.length && !SEPARATOR.test(lineText[end])) {
    end += 1;
  }
  return { start, end };
}

export function getCompletionItems(
  document: GedcomDocument,
  position: Position,
  lineText: string,
): CompletionItem[] {
  const token = tokenAround(lineText, position.character);
  const at = (character: number): Position => ({
    line: position.line,
    character,
  });
  const insert: Range = { start: at(token.start), end: position };
  const replace: Range = { start: at(token.start), end: at(token.end) };
  return document.getCompletions(position, lineText).map((item) => ({
    label: item.label,
    kind: kinds[item.kind],
    detail: item.detail,
    textEdit: { newText: item.label, insert, replace },
  }));
}
