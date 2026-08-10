import { ASTNode } from "../parser";

export function getGedcomVersion(nodes: ASTNode[]) {
  const HEAD = nodes.find((node) => node.tokens.TAG?.value === "HEAD");
  const GEDC = HEAD?.children.find((node) => node.tokens.TAG?.value === "GEDC");
  const VERS = GEDC?.children.find((node) => node.tokens.TAG?.value === "VERS");
  // The delimiter after a tag belongs to the value, so this one can begin with
  // spaces. No caller reads it through resolveValue, so it is trimmed here.
  return VERS?.tokens.VALUE?.value?.trim();
}
