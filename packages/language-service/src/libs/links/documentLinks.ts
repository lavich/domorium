import { TokenNames, type ASTNode } from "gedcom-validator";
import type { DocumentLink } from "../../types";

const ABSOLUTE_PATH = /^(?:\/|[A-Za-z]:[\\/]|\\\\)/u;
const URI_SCHEME = /^[A-Za-z][A-Za-z0-9+.-]*:/u;

export function documentLinks(nodes: ASTNode[]): DocumentLink[] {
  const links: DocumentLink[] = [];
  const version = nodes
    .find((node) => node.tokens[TokenNames.TAG]?.value === "HEAD")
    ?.children.find((node) => node.tokens[TokenNames.TAG]?.value === "GEDC")
    ?.children.find((node) => node.tokens[TokenNames.TAG]?.value === "VERS")
    ?.tokens[TokenNames.VALUE]?.value;
  const isGedcom7 = !version?.startsWith("5");

  const visit = (node: ASTNode): void => {
    const tag = node.tokens[TokenNames.TAG]?.value;
    const value = node.tokens[TokenNames.VALUE];
    if (tag === "FILE" && value?.value.trim()) {
      const targetText = value.value.trim();
      const kind = isGedcom7
        ? supportedUrlKind(targetText) ?? gedcom7LocalFileKind(targetText)
        : gedcom551FileKind(targetText);
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
