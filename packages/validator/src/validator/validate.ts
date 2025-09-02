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
import { RuleEngine } from "./rule-engine";

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

export function validate(
  nodes: ASTNode[],
  parentType: GedcomType = GedcomType(""),
  _version?: string,
): GedcomError[] {
  const version = _version || getGedcomVersion(nodes);

  const scheme: GedcomScheme = version?.startsWith("5")
    ? g551validationJson
    : g7validationJson;

  const substructure = scheme.substructure[parentType];
  if (!substructure) {
    return [];
  }

  const rules = new Map<
    GedcomTag,
    { min: number; max: number; type: GedcomType; payload: Payload }
  >();

  for (const [tagStr, { cardinality, type }] of Object.entries(substructure)) {
    const tag = GedcomTag(tagStr);
    const parsed = parseCardinality(cardinality);
    if (parsed) {
      rules.set(tag, { ...parsed, type, payload: scheme.payload[type] });
    }
  }

  const errors: GedcomError[] = [];
  const parentTag = scheme.tag[GedcomType(parentType)];

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

    const tagToken = node.tokens.TAG;
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

    if (rule.max === 0) {
      errors.push({
        code: ValidationErrorCode.ManyOccurrences,
        message: `Too many occurrences of ${tag} in parent ${parentTag}`,
        range: tagToken?.range || node.range,
        level: "error",
      });
    } else {
      rule.max--;
    }

    if (rule.min > 0) {
      rule.min--;
    }

    const substr = scheme.substructure[parentType];
    const nodeType = substr[GedcomTag(node.tokens.TAG!.value)].type;

    const ruleEngine = new RuleEngine(scheme);
    errors.push(...ruleEngine.validate(node, nodeType));

    errors.push(...validate(node.children, rule.type, version));
  }

  for (const [tag, rule] of rules) {
    if (rule.min > 0) {
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
