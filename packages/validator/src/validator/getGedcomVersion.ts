import {ASTNode} from "../parser";

export function getGedcomVersion(nodes: ASTNode[]) {
  const HEAD = nodes.find((node) => node.tokens.TAG?.value === "HEAD");
  const GEDC = HEAD?.children.find((node) => node.tokens.TAG?.value === "GEDC");
  const VERS = GEDC?.children.find((node) => node.tokens.TAG?.value === "VERS");
  return VERS?.tokens.VALUE?.value;
}
