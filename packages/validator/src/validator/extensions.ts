import { ASTNode, resolveValue } from "../parser";
import { GedcomTag } from "../schemes/schema-types";
import { GedcomError } from "../types/errors";

export enum ExtensionErrorCode {
  UndocumentedTag = "VAL008",
  DuplicateDeclaration = "VAL009",
}

// Both GEDCOM 5.5.1 and 7.0 reserve the leading underscore for tags an
// application defines for itself, so the prefix is the whole test.
export function isExtensionTag(tag: string): boolean {
  return tag.startsWith("_");
}

export interface ExtensionContext {
  // Declared tag -> the URI that gives it meaning, from HEAD.SCHMA.
  tags: Map<GedcomTag, string>;
  // GEDCOM 7 requires every extension tag to be given a URI in SCHMA; 5.5.1
  // has no such structure, so there is nothing to hold those documents to.
  requireDeclaration: boolean;
}

export function emptyExtensions(): ExtensionContext {
  return { tags: new Map(), requireDeclaration: false };
}

// "_SKYPEID http://xmlns.com/foaf/0.1/skypeID" — an extension tag, then the
// absolute URI defining it. The tag half matches what the lexer accepts as a
// tag, so a lowercase name is rejected here as it would be there.
const TAG_DEF_REGEXP = /^(_[A-Z0-9_]*)\s+([A-Za-z][A-Za-z0-9+.-]*:\S*)$/;

export function parseTagDef(
  value: string,
): { tag: GedcomTag; uri: string } | null {
  const match = value.trim().match(TAG_DEF_REGEXP);
  return match ? { tag: GedcomTag(match[1]), uri: match[2] } : null;
}

export function collectExtensions(
  nodes: ASTNode[],
  requireDeclaration: boolean,
): { context: ExtensionContext; errors: GedcomError[] } {
  const tags = new Map<GedcomTag, string>();
  const errors: GedcomError[] = [];

  const HEAD = nodes.find((node) => node.tokens.TAG?.value === "HEAD");
  const SCHMA = HEAD?.children.find(
    (node) => node.tokens.TAG?.value === "SCHMA",
  );

  for (const node of SCHMA?.children ?? []) {
    if (node.tokens.TAG?.value !== "TAG") {
      continue;
    }
    const def = parseTagDef(resolveValue(node));
    if (!def) {
      // Malformed declarations are reported by the tag-def payload check in
      // RuleNode, which owns payload shape for every tag.
      continue;
    }
    if (tags.has(def.tag)) {
      errors.push({
        code: ExtensionErrorCode.DuplicateDeclaration,
        message: `Extension tag ${def.tag} is declared more than once`,
        range: node.tokens.VALUE?.range ?? node.range,
        level: "warning",
      });
      continue;
    }
    tags.set(def.tag, def.uri);
  }

  return { context: { tags, requireDeclaration }, errors };
}
