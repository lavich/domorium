import type { GedcomDialect } from "@domorium/validator";

import type { DocumentLink, DocumentVersion, WorkspaceEdit } from "../../types";

export interface RetargetFileLinksOptions {
  links: DocumentLink[];
  dialect: GedcomDialect | undefined;
  /** Plain paths, as a caller writes them rather than as GEDCOM spells them. */
  from: string;
  to: string;
  version: DocumentVersion;
}

/**
 * A GEDCOM 7 local `FILE` payload is a URI reference and a 5.5.1 one is a path,
 * so escaping applies to the first and would invent a filename in the second.
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
  // Literal: decoding it too would match a file named with a space against one
  // named with %20.
  const from = normalize(options.from, options.dialect);
  const newText = encodeFileTarget(options.to, options.dialect);
  const edits = options.links
    .filter(
      (link) =>
        link.kind === "file-relative" &&
        normalize(
          decodeFileTarget(link.targetText, options.dialect),
          options.dialect,
        ) === from,
    )
    .map((link) => ({ range: link.range, newText }));
  return { version: options.version, edits };
}

/**
 * `./a.jpg` and `a.jpg` name one file. A 5.5.1 payload is a string, so what
 * wrote it chose the separator and `\` is one; a GEDCOM 7 payload is a URI
 * reference, where `\` separates nothing and is a character in a name.
 */
function normalize(path: string, dialect: GedcomDialect | undefined): string {
  const separators = dialect === "7.0" ? path : path.replaceAll("\\", "/");
  return separators.replace(/^\.\//u, "");
}
