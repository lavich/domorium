import {
  escapePayload,
  type GedcomDialect,
  type PayloadKind,
} from "@domorium/validator";

const MAX_LINE_551 = 255;
const SPLIT_SEARCH = 24;

function escapedLength(text: string, dialect: GedcomDialect): number {
  return dialect === "5.5.1"
    ? text.length + text.split("@").length - 1
    : text.length;
}

function isLowSurrogate(text: string, index: number): boolean {
  const code = text.charCodeAt(index);
  return code >= 0xdc00 && code <= 0xdfff;
}

function splitAt(text: string, limit: number, dialect: GedcomDialect): number {
  let end = 0;
  let used = 0;
  while (end < text.length) {
    const width = isLowSurrogate(text, end + 1) ? 2 : 1;
    const cost = escapedLength(text.slice(end, end + width), dialect);
    if (used + cost > limit) {
      break;
    }
    used += cost;
    end += width;
  }
  for (
    let back = end, tries = 0;
    back > 0 && tries < SPLIT_SEARCH;
    back--, tries++
  ) {
    if (
      text[back - 1] !== " " &&
      text[back] !== " " &&
      !isLowSurrogate(text, back)
    ) {
      return back;
    }
  }
  return Math.max(end, 1);
}

function chunks(
  text: string,
  firstLimit: number,
  concLimit: number,
  dialect: GedcomDialect,
): string[] {
  if (dialect !== "5.5.1" || escapedLength(text, dialect) <= firstLimit) {
    return [text];
  }
  const pieces: string[] = [];
  let rest = text;
  let limit = firstLimit;
  while (escapedLength(rest, dialect) > limit) {
    const at = splitAt(rest, limit, dialect);
    pieces.push(rest.slice(0, at));
    rest = rest.slice(at);
    limit = concLimit;
  }
  pieces.push(rest);
  return pieces;
}

export function writeValueLines(
  level: number,
  tag: string,
  value: string,
  kind: PayloadKind["kind"],
  dialect: GedcomDialect,
  terminator: string,
): string[] {
  const logical = value.replace(/\r\n|\n\r|\r/g, "\n").split("\n");
  const room = (prefix: string) =>
    MAX_LINE_551 - prefix.length - terminator.length;
  const head = `${level} ${tag} `;
  const continuation = `${level + 1} CONT `;
  const concatenation = `${level + 1} CONC `;
  const lines: string[] = [];
  logical.forEach((text, index) => {
    const prefix = index === 0 ? head : continuation;
    const pieces =
      kind === "text"
        ? chunks(text, room(prefix), room(concatenation), dialect)
        : [text];
    pieces.forEach((piece, pieceIndex) => {
      const escaped = escapePayload(piece, dialect, kind);
      if (pieceIndex > 0) {
        lines.push(`${concatenation}${escaped}`);
      } else if (index === 0) {
        lines.push(escaped ? `${head}${escaped}` : `${level} ${tag}`);
      } else {
        lines.push(escaped ? `${continuation}${escaped}` : `${level + 1} CONT`);
      }
    });
  });
  return lines;
}
