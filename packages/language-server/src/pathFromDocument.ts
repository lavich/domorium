interface ParsedUri {
  origin: string;
  segments: string[];
}

const DRIVE = /^[A-Za-z]:$/u;

export function pathFromDocument(
  documentUri: string,
  fileUri: string,
): string | undefined {
  const document = parse(documentUri);
  const file = parse(fileUri);
  if (!document || !file || document.origin !== file.origin) {
    return undefined;
  }
  const folder = document.segments.slice(0, -1);
  const [documentRoot, fileRoot] = [folder[0], file.segments[0]];
  if (
    documentRoot !== undefined &&
    fileRoot !== undefined &&
    (DRIVE.test(documentRoot) || DRIVE.test(fileRoot)) &&
    documentRoot.toLowerCase() !== fileRoot.toLowerCase()
  ) {
    return undefined;
  }
  let shared = 0;
  while (
    shared < folder.length &&
    shared < file.segments.length - 1 &&
    sameSegment(folder[shared]!, file.segments[shared]!, shared)
  ) {
    shared += 1;
  }
  return [
    ...folder.slice(shared).map(() => ".."),
    ...file.segments.slice(shared),
  ].join("/");
}

function sameSegment(a: string, b: string, index: number): boolean {
  return index === 0 && DRIVE.test(a)
    ? a.toLowerCase() === b.toLowerCase()
    : a === b;
}

function parse(uri: string): ParsedUri | undefined {
  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    return undefined;
  }
  if (!url.pathname.startsWith("/")) {
    return undefined;
  }
  const segments = url.pathname.slice(1).split("/").map(decodeSegment);
  // A payload would read an escaped separator as a real one, naming another file.
  if (segments.some((segment) => /[/\\]/u.test(segment))) {
    return undefined;
  }
  return { origin: `${url.protocol}//${url.host}`, segments };
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
