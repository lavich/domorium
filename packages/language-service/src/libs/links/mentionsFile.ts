const LINE_TERMINATOR = /\r\n|\r|\n/u;
const ESCAPE = /%[0-9A-Fa-f]{2}/u;
const ESCAPES = /(?:%[0-9A-Fa-f]{2})+/gu;
const BEFORE_A_NAME = new Set([" ", "/", "\\"]);

export function mentionsFile(text: string, path: string): boolean {
  const name = path.split("/").at(-1) ?? "";
  if (name === "" || (!text.includes(name) && !ESCAPE.test(text))) {
    return false;
  }
  return text.split(LINE_TERMINATOR).some((line) => {
    const raw = line.trim();
    // Decoding the line rather than encoding the name matches every spelling
    // GEDCOM 7 allows; the raw line keeps a 5.5.1 name that holds a %.
    return endsInName(decodeLeniently(raw), name) || endsInName(raw, name);
  });
}

function endsInName(line: string, name: string): boolean {
  if (!line.endsWith(name)) {
    return false;
  }
  const before = line.at(-name.length - 1);
  return before === undefined || BEFORE_A_NAME.has(before);
}

function decodeLeniently(text: string): string {
  return text.replace(ESCAPES, (run) => {
    const bytes = run.slice(1).split("%");
    let decoded = "";
    let start = 0;
    while (start < bytes.length) {
      let end = Math.min(bytes.length, start + 4);
      for (; end > start; end -= 1) {
        try {
          decoded += decodeURIComponent(
            `%${bytes.slice(start, end).join("%")}`,
          );
          break;
        } catch {
          continue;
        }
      }
      if (end === start) {
        decoded += `%${bytes[start]}`;
        end = start + 1;
      }
      start = end;
    }
    return decoded;
  });
}
