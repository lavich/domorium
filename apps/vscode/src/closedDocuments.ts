import { mentionsFile } from "@domorium/language-server";

export function decodeText(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes);
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes);
  }
  return new TextDecoder("utf-8").decode(bytes);
}

export async function countMentioning(
  files: Iterable<readonly [string, Uint8Array | PromiseLike<Uint8Array>]>,
  paths: string[],
  cancelled: () => boolean,
): Promise<string[] | undefined> {
  const found: string[] = [];
  for (const [label, file] of files) {
    let bytes: Uint8Array;
    try {
      bytes = await file;
    } catch {
      continue;
    }
    if (cancelled()) {
      return undefined;
    }
    const text = decodeText(bytes);
    if (paths.some((path) => mentionsFile(text, path))) {
      found.push(label);
    }
  }
  return found;
}

export function scanAfterRenames(
  count: (
    paths: string[],
    cancelled: () => boolean,
  ) => Promise<string[] | undefined>,
  warn: (paths: string[], found: string[]) => void,
): (paths: string[]) => Promise<void> {
  let pending: string[] = [];
  let latest = 0;
  return async (paths) => {
    pending = [...new Set([...pending, ...paths])];
    const scan = ++latest;
    const asked = pending;
    let found: string[] | undefined;
    try {
      found = await count(asked, () => scan !== latest);
    } catch {
      found = undefined;
    } finally {
      if (scan === latest) {
        pending = [];
      }
    }
    if (scan === latest && found !== undefined && found.length > 0) {
      warn(asked, found);
    }
  };
}
