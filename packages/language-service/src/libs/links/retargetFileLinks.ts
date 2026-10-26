import { GedcomDocument, type GedcomDialect } from "@domorium/validator";

import type {
  DocumentLink,
  DocumentVersion,
  EditRefusal,
  WorkspaceEdit,
  WorkspaceEditResult,
} from "../../types";
import { documentLinks } from "./documentLinks";

// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTER = /[\u0000-\u0008\u000A-\u001F\u007F]/u;

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
  const newText = encodeFileTarget(options.to, options.dialect);
  const edits = linksNaming(options).map((link) => ({
    range: link.range,
    newText,
  }));
  return { version: options.version, edits };
}

export interface MoveFileLinksOptions extends RetargetFileLinksOptions {
  text: string;
}

export function moveFileLinks(
  options: MoveFileLinksOptions,
): WorkspaceEditResult | EditRefusal {
  const { dialect, version } = options;
  const links = linksNaming(options);
  if (normalize(options.to, dialect) === normalize(options.from, dialect)) {
    // Re-encoding would rewrite %2E%2E/x.jpg as ../x.jpg, which GEDCOM 7
    // cannot carry, and targetText is trimmed where the range is not.
    const lines = options.text.split(/\r\n|\r|\n/u);
    const edits = links.map(({ range }) => ({
      range,
      newText: (lines[range.start.line] ?? "").slice(
        range.start.character,
        range.end.character,
      ),
    }));
    return { ok: true, edit: { version, edits } };
  }
  if (links.length === 0) {
    return { ok: true, edit: { version, edits: [] } };
  }
  const newText = writableTarget(options.to, dialect);
  if (newText === undefined) {
    return {
      ok: false,
      code: "unwritable-file-target",
      message: `A FILE payload in this document cannot name ${JSON.stringify(options.to)}.`,
    };
  }
  const edits = links.map((link) => ({ range: link.range, newText }));
  return { ok: true, edit: { version, edits } };
}

function linksNaming(options: RetargetFileLinksOptions): DocumentLink[] {
  // Literal: decoding it too would match a file named with a space against one
  // named with %20.
  const from = normalize(options.from, options.dialect);
  return options.links.filter(
    (link) =>
      link.kind === "file-relative" &&
      normalize(
        decodeFileTarget(link.targetText, options.dialect),
        options.dialect,
      ) === from,
  );
}

// The reader decides, so that a rule restated here cannot drift from it.
function writableTarget(
  path: string,
  dialect: GedcomDialect | undefined,
): string | undefined {
  // Lexed as-is in 5.5.1, these would be saved as other characters or none.
  if (!path.isWellFormed() || CONTROL_CHARACTER.test(path)) {
    return undefined;
  }
  const payload = encodeFileTarget(path, dialect);
  const document = new GedcomDocument();
  document.createDocument(`0 @O1@ OBJE\n1 FILE ${payload}\n`);
  const [link] = documentLinks(document.getNodes(), dialect);
  const readsBack =
    link?.kind === "file-relative" &&
    normalize(decodeFileTarget(link.targetText, dialect), dialect) ===
      normalize(path, dialect);
  return readsBack ? payload : undefined;
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
