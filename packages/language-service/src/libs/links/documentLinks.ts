import {
  TokenNames,
  type ASTNode,
  type GedcomDialect,
} from "@domorium/validator";
import type { DocumentLink } from "../../types";

const ABSOLUTE_PATH = /^(?:\/|[A-Za-z]:[\\/]|\\\\)/u;
const URI_SCHEME = /^[A-Za-z][A-Za-z0-9+.-]*:/u;

/**
 * How a FILE payload is to be read, or nothing where the dialect cannot carry
 * it. Shared with the media query so both answer for the same set of files.
 */
export function fileLinkKind(
  targetText: string,
  dialect: GedcomDialect | undefined,
): DocumentLink["kind"] | undefined {
  if (dialect === undefined) {
    return undefined;
  }
  return dialect === "7.0"
    ? (supportedUrlKind(targetText) ?? gedcom7LocalFileKind(targetText))
    : gedcom551FileKind(targetText);
}

export function documentLinks(
  nodes: ASTNode[],
  dialect: GedcomDialect | undefined,
): DocumentLink[] {
  const links: DocumentLink[] = [];
  if (dialect === undefined) {
    return links;
  }

  const visit = (node: ASTNode): void => {
    const tag = node.tokens[TokenNames.TAG]?.value;
    const value = node.tokens[TokenNames.VALUE];
    if (tag === "FILE" && value?.value.trim()) {
      const targetText = value.value.trim();
      const kind = fileLinkKind(targetText, dialect);
      if (kind) {
        links.push({ range: value.range, targetText, kind });
      }
    } else if (tag === "WWW" && value) {
      try {
        const url = new URL(value.value);
        if (url.protocol === "http:" || url.protocol === "https:") {
          links.push({
            range: value.range,
            targetText: value.value,
            kind: "http",
          });
        }
      } catch {
        // Invalid URL values remain ordinary text.
      }
    }
    node.children.forEach(visit);
  };

  nodes.forEach(visit);
  return links;
}

function supportedUrlKind(
  targetText: string,
): DocumentLink["kind"] | undefined {
  try {
    const url = new URL(targetText);
    if (url.protocol === "file:") {
      return "file-absolute";
    }
    if (url.protocol === "http:" || url.protocol === "https:") {
      return "http";
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function gedcom7LocalFileKind(
  targetText: string,
): DocumentLink["kind"] | undefined {
  const segments = targetText.split("/");
  const isPortableLocalPath =
    !targetText.startsWith("/") &&
    !targetText.includes("\\") &&
    !targetText.includes("?") &&
    !targetText.includes("#") &&
    !targetText.includes(":") &&
    !segments.includes("..");
  return isPortableLocalPath ? "file-relative" : undefined;
}

function gedcom551FileKind(
  targetText: string,
): DocumentLink["kind"] | undefined {
  const urlKind = supportedUrlKind(targetText);
  if (urlKind) {
    return urlKind;
  }
  if (ABSOLUTE_PATH.test(targetText)) {
    return "file-absolute";
  }
  return URI_SCHEME.test(targetText) ? undefined : "file-relative";
}
