import type { ASTNode } from "@domorium/validator";

/**
 * Where the format says a record carries a name of its own. A family has none:
 * it is known by its spouses, which are pointers to other records and so not a
 * question this function can answer.
 */
const LABEL_TAG: Record<string, string> = {
  INDI: "NAME",
  SUBM: "NAME",
  REPO: "NAME",
  SOUR: "TITL",
  OBJE: "TITL",
};

/**
 * The payload as written. Reading a personal name — the slashes around a
 * surname, the order of its parts, the parts that are missing — is its own
 * subject, and guessing at it here would put a guess in every host at once.
 */
export function recordLabel(node: ASTNode): string | undefined {
  const tag = LABEL_TAG[node.tokens.TAG?.value ?? ""];
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
