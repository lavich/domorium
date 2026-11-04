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
