import type { GedcomScheme } from "../schemes/schema-types";
import { GedcomTag, GedcomType } from "../schemes/schema-types";
import type { StructureField, StructureShape } from "../types/structure";
import type { RuleNode } from "./rule-node";
import { getRules } from "./validate";

export function typeAtPath(
  scheme: GedcomScheme,
  path: readonly string[],
): GedcomType | undefined {
  let type = GedcomType("");
  for (const tag of path) {
    const entry = scheme.substructure[type]?.[GedcomTag(tag)];
    if (!entry) {
      return undefined;
    }
    type = entry.type;
  }
  return path.length > 0 ? type : undefined;
}

export function structureShape(
  scheme: GedcomScheme,
  ruleNode: RuleNode,
  type: GedcomType,
): StructureShape | undefined {
  const rules = getRules(scheme, type);
  if (!rules) {
    return undefined;
  }
  const own = ruleNode.payloadShape(type);
  const fields: StructureField[] = [];
  for (const [tag, rule] of rules) {
    const field = ruleNode.payloadShape(rule.type);
    fields.push({
      tag,
      schemaId: rule.type,
      min: rule.min,
      max: Number.isFinite(rule.max) ? rule.max : null,
      payload: field.payload,
      payloadRequired: field.required,
    });
  }
  return {
    schemaId: type,
    payload: own.payload,
    payloadRequired: own.required,
    fields,
  };
}
