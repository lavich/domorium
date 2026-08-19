import {
  GedcomTag,
  GedcomType,
  Payload,
  GedcomScheme,
} from "../schemes/schema-types";
import g7validationJson from "../schemes/g7validation.json";

import g551validationJson from "../schemes/g551validation.json";
import { ASTNode } from "../parser";
import { GedcomError, GedcomErrorCode } from "../types/errors";
import { getGedcomVersion } from "./getGedcomVersion";
import { RuleNode } from "./rule-node";
import {
  emptyExtensions,
  ExtensionContext,
  isExtensionTag,
  undocumentedTag,
} from "./extensions";

function parseCardinality(str: string): { min: number; max: number } | null {
  const re = /^\{(?<a>\d+):(?<b>\d+|M)}$/;
  const match = str.match(re);
  if (!match?.groups) {
    return null;
  }
  const min = parseInt(match.groups.a, 10);
  const max = match.groups.b === "M" ? Infinity : parseInt(match.groups.b, 10);
  return { min, max };
}

interface Rule {
  min: number;
  max: number;
  type: GedcomType;
  payload: Payload;
}

// What a parent type permits is fixed by the schema, so the table is built
// once per type rather than once per node. Rebuilding it per node meant a
// document of 200k records ran the cardinality regexp twenty million times.
// The tables are immutable; occurrences are counted separately per parent.
const ruleTables = new WeakMap<
  GedcomScheme,
  Map<GedcomType, Map<GedcomTag, Rule>>
>();

function getRules(
  scheme: GedcomScheme,
  parentType: GedcomType,
): Map<GedcomTag, Rule> | undefined {
  let byType = ruleTables.get(scheme);
  if (!byType) {
    byType = new Map();
    ruleTables.set(scheme, byType);
  }

  const cached = byType.get(parentType);
  if (cached) {
    return cached;
  }

  const substructure = scheme.substructure[parentType];
  // A leaf carries no substructure entry, and neither does a type the schema
  // never describes. One means every child is an error, the other means say
  // nothing, so they are told apart by the payload table, which every
  // described structure appears in.
  if (!substructure && !(parentType in scheme.payload)) {
    return undefined;
  }

  const rules = new Map<GedcomTag, Rule>();
  for (const [tagStr, { cardinality, type }] of Object.entries(
    substructure ?? {},
  )) {
    const parsed = parseCardinality(cardinality);
    if (parsed) {
      rules.set(GedcomTag(tagStr), {
        ...parsed,
        type,
        payload: scheme.payload[type],
      });
    }
  }
  byType.set(parentType, rules);
  return rules;
}

/** The structure type a tag definition names, when its URI is a standard one. */
function aliasedType(
  extensions: ExtensionContext,
  tag: GedcomTag,
  scheme: GedcomScheme,
): GedcomType | undefined {
  const uri = extensions.tags.get(tag);
  const type = uri ? GedcomType(uri) : undefined;
  return type && scheme.payload[type] ? type : undefined;
}

export function schemeFor(nodes: ASTNode[]): GedcomScheme {
  const version = getGedcomVersion(nodes);
  return version?.startsWith("5") ? g551validationJson : g7validationJson;
}

export class GedcomValidator {
  constructor(
    private readonly pointers: Map<string, ASTNode[]> = new Map<
      string,
      ASTNode[]
    >(),
    private readonly extensions: ExtensionContext = emptyExtensions(),
    /** A fragment is not a document, so nothing is required of its root. */
    private readonly fragment = false,
  ) {}

  setScheme(nodes: ASTNode[]): GedcomScheme {
    return schemeFor(nodes);
  }

  validate(
    nodes: ASTNode[],
    parentType: GedcomType = GedcomType(""),
    _scheme?: GedcomScheme,
    parent?: ASTNode,
  ): GedcomError[] {
    const errors: GedcomError[] = [];
    this.collect(
      errors,
      nodes,
      parentType,
      _scheme || this.setScheme(nodes),
      parent,
    );
    return errors;
  }

  // The accumulator is carried down the walk rather than returned at each level:
  // spreading a returned array into push is one argument per element, and V8
  // has an argument limit a document's diagnostics can exceed.
  collect(
    errors: GedcomError[],
    nodes: ASTNode[],
    parentType: GedcomType,
    scheme: GedcomScheme,
    /** Absent at the root, where the start of the document is the honest place. */
    parent?: ASTNode,
  ): void {
    const rules = getRules(scheme, parentType);
    if (!rules) {
      return;
    }

    // The rule table is shared, so occurrences are tallied here instead of
    // being subtracted from it.
    const occurrences = new Map<GedcomTag, number>();
    const parentTag = scheme.tag[GedcomType(parentType)];
    const ruleNode = new RuleNode(scheme, this.pointers, this.extensions);

    for (const node of nodes) {
      // Not a GEDCOM line, and the parser has already said so. #252
      if (node.tokens.LEVEL === undefined) {
        continue;
      }
      const tag = node.tokens.TAG?.value
        ? GedcomTag(node.tokens.TAG?.value)
        : undefined;
      if (!tag) {
        errors.push({
          code: GedcomErrorCode.MissingTag,
          message: `Missing required tag`,
          range: { start: node.range.start, end: node.range.start },
          level: "error",
        });
        continue;
      }

      if (tag === GedcomTag("CONT") || tag === GedcomTag("CONC")) {
        continue;
      }

      const tagToken = node.tokens.TAG;

      if (isExtensionTag(tag)) {
        if (
          this.extensions.requireDeclaration &&
          !this.extensions.tags.has(tag)
        ) {
          errors.push(undocumentedTag(tag, tagToken?.range || node.range));
        }
        // An aliased tag is that structure, so its payload and substructures
        // follow the standard definition. Its position does not: a relocated
        // standard structure may only appear under a superstructure that does
        // not document it, so this parent's rule table is not consulted.
        const aliased = aliasedType(this.extensions, tag, scheme);
        if (aliased) {
          ruleNode.collect(errors, node, aliased);
          this.collect(errors, node.children, aliased, scheme, node);
        }
        // An undocumented extension defines its own payload and substructures,
        // so there is nothing to check its subtree against. See ADR-0008.
        continue;
      }

      const rule = rules.get(tag);

      if (!rule) {
        const upperCased = GedcomTag(tag.toUpperCase());
        const meant =
          upperCased !== tag && rules.has(upperCased) ? upperCased : null;
        errors.push({
          code: GedcomErrorCode.UnknownTag,
          message: meant
            ? `A tag is written in upper case: ${meant}, not ${tag}`
            : `Unknown tag ${tag} in parent ${parentTag || "root"}`,
          range: tagToken?.range || node.range,
          level: "warning",
        });
        continue;
      }

      const seen = (occurrences.get(tag) ?? 0) + 1;
      occurrences.set(tag, seen);
      if (seen > rule.max) {
        errors.push({
          code: GedcomErrorCode.ManyOccurrences,
          message: `Too many occurrences of ${tag} in parent ${parentTag}`,
          range: tagToken?.range || node.range,
          level: "error",
        });
      }

      ruleNode.collect(errors, node, rule.type);

      this.collect(errors, node.children, rule.type, scheme, node);
    }

    for (const [tag, rule] of rules) {
      if (this.fragment && parentType === GedcomType("")) {
        break;
      }
      if ((occurrences.get(tag) ?? 0) < rule.min) {
        errors.push({
          code: GedcomErrorCode.MissingTag,
          message: `Missing required tag ${tag} in ${parentTag || "root"}`,
          range: parent?.range ?? {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 0 },
          },
          level: "error",
        });
      }
    }
  }
}
