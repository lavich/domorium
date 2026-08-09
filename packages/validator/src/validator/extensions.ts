import { ASTNode, resolveValue } from "../parser";
import { GedcomScheme, GedcomTag, GedcomType } from "../schemes/schema-types";
import { GedcomError } from "../types/errors";
import { Range } from "../types/position";

export enum ExtensionErrorCode {
  UndocumentedTag = "VAL008",
  DuplicateDeclaration = "VAL009",
}

export function isExtensionTag(tag: string): boolean {
  return tag.startsWith("_");
}

export interface ExtensionContext {
  // Declared tag -> its URI, from HEAD.SCHMA.
  tags: Map<GedcomTag, string>;
  // Declared tag -> the standard tag its URI names, when the URI is a
  // standard one and the tag is therefore an abbreviation for it.
  aliases: Map<GedcomTag, GedcomTag>;
  // GEDCOM 7 requires every extension tag to be given a URI in SCHMA; 5.5.1
  // has no such structure, so there is nothing to hold those documents to.
  requireDeclaration: boolean;
}

export function emptyExtensions(): ExtensionContext {
  return { tags: new Map(), aliases: new Map(), requireDeclaration: false };
}

/** The standard tag `tag` abbreviates, or `tag` itself. */
export function resolveTag(
  extensions: ExtensionContext,
  tag: string,
): GedcomTag {
  return extensions.aliases.get(GedcomTag(tag)) ?? GedcomTag(tag);
}

// An extTag is an extension tag wherever it appears — as a tag, a calendar, a
// month, an epoch or an enumerated value.
export function undocumentedTag(tag: GedcomTag, range: Range): GedcomError {
  return {
    code: ExtensionErrorCode.UndocumentedTag,
    message: `Extension tag ${tag} is not declared in HEAD.SCHMA`,
    range,
    level: "warning",
  };
}

// "_SKYPEID http://xmlns.com/foaf/0.1/skypeID" — an extension tag, then the
// absolute URI defining it. The tag half matches what the lexer accepts as a
// tag, and requires a character after the underscore: a bare "_" is not one.
const TAG_DEF_REGEXP = /^(_[A-Z0-9_]+)\s+([A-Za-z][A-Za-z0-9+.-]*:\S*)$/;

export function parseTagDef(
  value: string,
): { tag: GedcomTag; uri: string } | null {
  const match = value.trim().match(TAG_DEF_REGEXP);
  return match ? { tag: GedcomTag(match[1]), uri: match[2] } : null;
}

export function collectExtensions(
  nodes: ASTNode[],
  requireDeclaration: boolean,
  scheme: GedcomScheme,
): { context: ExtensionContext; errors: GedcomError[] } {
  const tags = new Map<GedcomTag, string>();
  const aliases = new Map<GedcomTag, GedcomTag>();
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
    // One table covers every kind of alias: scheme.tag maps the URI of a
    // structure, enumeration value, calendar or month to the tag naming it.
    const standard = scheme.tag[GedcomType(def.uri)];
    if (standard) {
      aliases.set(def.tag, standard);
    }
  }

  return { context: { tags, aliases, requireDeclaration }, errors };
}
