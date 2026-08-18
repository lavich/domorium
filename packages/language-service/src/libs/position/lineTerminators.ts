/**
 * 5.5.1 ends a line with CR, LF, CR-LF or LF-CR. Splitting on LF alone reads a
 * file written with CR as one line. Two-character forms come first, so one
 * terminator is one break. See #251.
 */
export const LINE_TERMINATOR = /\r\n|\n\r|\r|\n/u;

export function lines(text: string): string[] {
  return text.split(LINE_TERMINATOR);
}
