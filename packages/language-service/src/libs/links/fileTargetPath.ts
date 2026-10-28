import type { GedcomDialect } from "@domorium/validator";

import { fileLinkKind } from "./documentLinks";
import { decodeFileTarget } from "./retargetFileLinks";

const DECODED_PATH = /^\.\.?$|[/\\:]/u;

/**
 * The root-relative path a relative FILE payload names, read from the folder of
 * the root-relative `documentPath`, or null where there is no such file to open.
 * `documentPath` is canonical: `/`-separated, with no `.`, `..` or empty segment.
 */
export function resolveFileTarget(
  documentPath: string,
  targetText: string,
  dialect: GedcomDialect | undefined,
): string | null {
  if (fileLinkKind(targetText, dialect) !== "file-relative") {
    return null;
  }
  const isGedcom7 = dialect === "7.0";
  const segments = targetText.split(isGedcom7 ? "/" : /[/\\]/u);
  const last = segments.at(-1);
  if (last === "" || last === "." || last === "..") {
    return null;
  }
  const path = documentPath.split("/").slice(0, -1);
  for (const segment of segments) {
    if (segment === "" || segment === ".") {
      continue;
    }
    if (segment === ".." && !isGedcom7) {
      if (path.length === 0) {
        return null;
      }
      path.pop();
      continue;
    }
    const name = isGedcom7 ? decodeFileTarget(segment, dialect) : segment;
    // A host would read a decoded separator or parent as a path, not a name.
    if (name !== segment && DECODED_PATH.test(name)) {
      return null;
    }
    path.push(name);
  }
  return path.join("/");
}

/**
 * How a document at `documentPath` spells the root-relative `path`, unescaped:
 * the inverse of `resolveFileTarget` in 5.5.1, and the form `moveFileLinks`
 * takes, which escapes it for GEDCOM 7.
 */
export function relativeFilePath(documentPath: string, path: string): string {
  const from = documentPath.split("/").slice(0, -1);
  const to = path.split("/");
  let shared = 0;
  while (
    shared < from.length &&
    shared < to.length - 1 &&
    from[shared] === to[shared]
  ) {
    shared += 1;
  }
  return [
    ...Array.from({ length: from.length - shared }, () => ".."),
    ...to.slice(shared),
  ].join("/");
}
