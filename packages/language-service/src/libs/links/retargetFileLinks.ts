import type { GedcomDialect } from "@domorium/validator";

import type { DocumentLink, DocumentVersion, WorkspaceEdit } from "../../types";

export interface RetargetFileLinksOptions {
  links: DocumentLink[];
  dialect: GedcomDialect | undefined;
  /** The file being pointed at, as the caller writes a path, not as GEDCOM does. */
  from: string;
  /** Where it went, likewise. */
  to: string;
  version: DocumentVersion;
}

/**
 * A GEDCOM 7 local `FILE` payload is a URI reference, so what it contains is
 * escaped and a path is not. 5.5.1 says path, and escaping one there would
 * invent a file nobody has.
 */
export function decodeFileTarget(
  target: string,
  dialect: GedcomDialect | undefined,
): string {
  if (dialect !== "7.0") {
    return target;
  }
  return target
    .split("/")
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        // Half an escape is not an escape; it is the characters it is made of.
        return segment;
      }
    })
    .join("/");
}

export function encodeFileTarget(
  path: string,
  dialect: GedcomDialect | undefined,
): string {
  if (dialect !== "7.0") {
    return path;
  }
  return path.split("/").map(encodeURIComponent).join("/");
}

export function retargetFileLinks(
  options: RetargetFileLinksOptions,
): WorkspaceEdit {
  // from is taken literally. Decoding it too would make a file whose name
  // contains %20 match a link to a file whose name contains a space.
  const from = normalize(options.from);
  const newText = encodeFileTarget(options.to, options.dialect);
  const edits = options.links
    .filter(
      (link) =>
        link.kind === "file-relative" &&
        normalize(decodeFileTarget(link.targetText, options.dialect)) === from,
    )
    .map((link) => ({ range: link.range, newText }));
  return { version: options.version, edits };
}

/** `./a.jpg` and `a.jpg` name one file; nothing else here is path arithmetic. */
function normalize(path: string): string {
  return path.replace(/^\.\//u, "");
}
