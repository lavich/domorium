import type { ASTNode } from "@domorium/validator";

// A family is missing because it is known by its spouses, and those are
// pointers to other records.
const LABEL_TAG: Record<string, string> = {
  INDI: "NAME",
  SUBM: "NAME",
  REPO: "NAME",
  SOUR: "TITL",
  OBJE: "TITL",
};

/** The payload as written: reading a personal name is its own subject. */
export function recordLabel(node: ASTNode): string | undefined {
  const recordTag = node.tokens.TAG?.value ?? "";
  // A shared note is its own text: SNOTE in GEDCOM 7, NOTE in 5.5.1.
  if (recordTag === "SNOTE" || recordTag === "NOTE") {
    return node.tokens.VALUE?.value || undefined;
  }
  const tag = LABEL_TAG[recordTag];
  if (!tag) {
    return undefined;
  }
  for (const child of node.children) {
    if (child.tokens.TAG?.value === tag) {
      return child.tokens.VALUE?.value || undefined;
    }
  }
  return undefined;
}
