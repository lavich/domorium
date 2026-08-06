import {
  GedcomTag,
  GedcomType,
  Payload,
  GedcomScheme,
} from "../schemes/schema-types";
import g7validationJson from "../schemes/g7validation.json";

import g551validationJson from "../schemes/g551validation.json";
import { ASTNode } from "../parser";
import { GedcomError } from "../types/errors";
import { getGedcomVersion } from "./getGedcomVersion";
import { RuleNode } from "./rule-node";
import {
  emptyExtensions,
  ExtensionContext,
  ExtensionErrorCode,
  isExtensionTag,
} from "./extensions";

enum ValidationErrorCode {
  UnknownTag = "VAL001",
  MissingTag = "VAL002",
  MissingValue = "VAL003",
  IncorrectValue = "VAL004",
  ShouldBeSetValue = "VAL005",
  MissingRef = "VAL006",
  ManyOccurrences = "VAL007",
}

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
  if (!substructure) {
    return undefined;
  }

  const rules = new Map<GedcomTag, Rule>();
  for (const [tagStr, { cardinality, type }] of Object.entries(substructure)) {
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

export class GedcomValidator {
  constructor(
    private readonly pointers: Map<string, ASTNode[]> = new Map<
      string,
      ASTNode[]
    >(),
    private readonly extensions: ExtensionContext = emptyExtensions(),
  ) {}

  setScheme(nodes: ASTNode[]): GedcomScheme {
    const version = getGedcomVersion(nodes);
    return version?.startsWith("5") ? g551validationJson : g7validationJson;
  }

  validate(
    nodes: ASTNode[],
    parentType: GedcomType = GedcomType(""),
    _scheme?: GedcomScheme,
  ): GedcomError[] {
    const scheme = _scheme || this.setScheme(nodes);

    const rules = getRules(scheme, parentType);
    if (!rules) {
      return [];
    }

    // The rule table is shared, so occurrences are tallied here instead of
    // being subtracted from it.
    const occurrences = new Map<GedcomTag, number>();
    const errors: GedcomError[] = [];
    const parentTag = scheme.tag[GedcomType(parentType)];
    const ruleNode = new RuleNode(scheme, this.pointers);

    for (const node of nodes) {
      const tag = node.tokens.TAG?.value
        ? GedcomTag(node.tokens.TAG?.value)
        : undefined;
      if (!tag) {
        errors.push({
          code: ValidationErrorCode.MissingTag,
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

      // An extension defines its own payload and substructures, so there is
      // nothing to check the subtree against. See ADR-0008.
      if (isExtensionTag(tag)) {
        if (
          this.extensions.requireDeclaration &&
          !this.extensions.tags.has(tag)
        ) {
          errors.push({
            code: ExtensionErrorCode.UndocumentedTag,
            message: `Extension tag ${tag} is not declared in HEAD.SCHMA`,
            range: tagToken?.range || node.range,
            level: "warning",
          });
        }
        continue;
      }

      const rule = rules.get(tag);

      if (!rule) {
        errors.push({
          code: ValidationErrorCode.UnknownTag,
          message: `Unknown tag ${tag} in parent ${parentTag}`,
          range: tagToken?.range || node.range,
          level: "warning",
        });
        continue;
      }

      const seen = (occurrences.get(tag) ?? 0) + 1;
      occurrences.set(tag, seen);
      if (seen > rule.max) {
        errors.push({
          code: ValidationErrorCode.ManyOccurrences,
          message: `Too many occurrences of ${tag} in parent ${parentTag}`,
          range: tagToken?.range || node.range,
          level: "error",
        });
      }

      errors.push(...ruleNode.validate(node, rule.type));

      errors.push(...this.validate(node.children, rule.type, scheme));
    }

    for (const [tag, rule] of rules) {
      if ((occurrences.get(tag) ?? 0) < rule.min) {
        errors.push({
          code: ValidationErrorCode.MissingTag,
          message: `Missing required tag ${tag} in ${parentTag || "root"}`,
          range: nodes[0]?.parent?.range ?? {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 0 },
          },
          level: "error",
        });
      }
    }

    return errors;
  }
}
