import type { ASTNode } from "@domorium/validator";

// A family is absent because it carries no name of its own. It is named by its
// spouses, which are pointers, so it needs a caller willing to resolve them.
const LABEL_TAG: Record<string, string> = {
  INDI: "NAME",
  SUBM: "NAME",
  REPO: "NAME",
  SOUR: "TITL",
  OBJE: "TITL",
};

/** In the order the specification writes them, whatever order the file used. */
const SPOUSE_TAGS = ["HUSB", "WIFE"];

/** The payload as written: reading a personal name is its own subject. */
export function recordLabel(
  node: ASTNode,
  resolve?: (xref: string) => ASTNode | undefined,
): string | undefined {
  const recordTag = node.tokens.TAG?.value ?? "";
  // A shared note carries its text on its own line rather than in a child.
  if (recordTag === "SNOTE" || recordTag === "NOTE") {
    return node.tokens.VALUE?.value || undefined;
  }
  if (recordTag === "FAM") {
    return resolve ? spouseNames(node, resolve) : undefined;
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

function spouseNames(
  family: ASTNode,
  resolve: (xref: string) => ASTNode | undefined,
): string | undefined {
  const names: string[] = [];
  for (const tag of SPOUSE_TAGS) {
    const xref = family.children.find(
      (child) => child.tokens.TAG?.value === tag,
    )?.tokens.XREF?.value;
    const spouse = xref ? resolve(xref) : undefined;
    const name = spouse && recordLabel(spouse);
    if (name) {
      names.push(name);
    }
  }
  return names.length ? names.join(" / ") : undefined;
}
