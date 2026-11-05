/**
 * 5.5.1 ends a line with CR, LF, CR-LF or LF-CR, two-character forms first so one
 * terminator is one break. See #251.
 */
export const LINE_TERMINATOR = /\r\n|\n\r|\r|\n/u;

export function lines(text: string): string[] {
  return text.split(LINE_TERMINATOR);
}

/** The four 5.5.1 allows, longest first, so a two-character form wins. See #251. */
export function terminatorOf(text: string): string {
  return ["\r\n", "\n\r", "\r", "\n"].find((eol) => text.includes(eol)) ?? "\n";
}

export function endOfText(text: string): { line: number; character: number } {
  let line = 0;
  let lineStart = 0;
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    if (code !== 10 && code !== 13) {
      continue;
    }
    const next = text.charCodeAt(index + 1);
    if ((code === 13 && next === 10) || (code === 10 && next === 13)) {
      index++;
    }
    line++;
    lineStart = index + 1;
  }
  return { line, character: text.length - lineStart };
}
