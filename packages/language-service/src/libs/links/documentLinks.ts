import { TokenNames, type ASTNode } from "@domorium/validator";
import type { DocumentLink } from "../../types";

const ABSOLUTE_PATH = /^(?:\/|[A-Za-z]:[\\/]|\\\\)/u;

export function documentLinks(nodes: ASTNode[]): DocumentLink[] {
  const links: DocumentLink[] = [];

  const visit = (node: ASTNode): void => {
    const tag = node.tokens[TokenNames.TAG]?.value;
    const value = node.tokens[TokenNames.VALUE];
    if (tag === "FILE" && value?.value.trim()) {
      const targetText = value.value.trim();
      links.push({
        range: value.range,
        targetText,
        kind: ABSOLUTE_PATH.test(targetText)
          ? "file-absolute"
          : "file-relative",
      });
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
