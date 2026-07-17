import type { ASTNode } from "../parser";
import type { Position } from "../types/position";
import {
  GedcomTag,
  GedcomType,
  type GedcomScheme,
} from "../schemes/schema-types";
import { RuleNode } from "../validator/rule-node";

export interface GedcomCompletion {
  label: string;
  kind: "tag" | "enum" | "pointer";
  detail?: string;
}

interface CompletionContext {
  nodes: ASTNode[];
  pointers: Map<string, ASTNode[]>;
  scheme: GedcomScheme;
  isGedcom7: boolean;
  position: Position;
  lineText: string;
}

const TAG_PREFIX = /^(\d+)\s+(?:@[^\s@]+@\s+)?([A-Z0-9_]*)$/;
const VALUE_PREFIX = /^(\d+)\s+(?:@[^\s@]+@\s+)?([A-Z0-9_]+)\s+(.*)$/;

function flattenNodes(nodes: ASTNode[]): ASTNode[] {
  return nodes.flatMap((node) => [node, ...flattenNodes(node.children)]);
}

function parseMax(cardinality: string): number | null {
  const match = /^\{\d+:(\d+|M)\}$/.exec(cardinality);
  if (!match) {
    return null;
  }
  return match[1] === "M" ? Infinity : Number(match[1]);
}

function resolveParent(context: CompletionContext, level: number) {
  if (level === 0) {
    return { parentType: GedcomType(""), siblings: context.nodes };
  }

  const nodes = flattenNodes(context.nodes).filter(
    (node) => node.range.start.line <= context.position.line,
  );
  const current = nodes.find(
    (node) =>
      node.range.start.line === context.position.line && node.level === level,
  );
  const parent =
    current?.parent ??
    nodes.findLast(
      (node) =>
        node.range.start.line < context.position.line &&
        node.level === level - 1,
    );
  if (!parent) {
    return null;
  }

  return {
    parentType: new RuleNode(context.scheme, context.pointers).getNodeType(
      parent,
    ),
    siblings: parent.children,
  };
}

function completeTags(
  context: CompletionContext,
  level: number,
): GedcomCompletion[] {
  const parent = resolveParent(context, level);
  if (!parent) {
    return [];
  }

  return Object.entries(context.scheme.substructure[parent.parentType] ?? {})
    .filter(([tag, entry]) => {
      const maximum = parseMax(entry.cardinality);
      if (maximum === null || maximum === Infinity) {
        return true;
      }
      const occurrences = parent.siblings.filter(
        (node) =>
          node.range.start.line !== context.position.line &&
          node.tokens.TAG?.value === tag,
      ).length;
      return occurrences < maximum;
    })
    .map(([tag, entry]) => ({
      label: GedcomTag(tag),
      kind: "tag",
      detail: context.scheme.label[entry.type]?.["en-US"],
    }));
}

function completeValues(
  context: CompletionContext,
  level: number,
  tag: string,
): GedcomCompletion[] {
  const parent = resolveParent(context, level);
  if (!parent) {
    return [];
  }

  const childType =
    context.scheme.substructure[parent.parentType]?.[GedcomTag(tag)]?.type;
  if (!childType) {
    return [];
  }

  const ruleNode = new RuleNode(context.scheme, context.pointers);
  const fieldType = ruleNode.getFieldType(childType);
  if (fieldType.type === "select" || fieldType.type === "multiselect") {
    return [...new Set(ruleNode.getAvailableValues(childType) ?? [])]
      .filter(Boolean)
      .map((label) => ({ label, kind: "enum" }));
  }
  if (fieldType.type === "pointer") {
    const values = ruleNode.getAvailableValues(childType) ?? [];
    if (context.isGedcom7) {
      values.push("@VOID@");
    }
    return [...new Set(values)]
      .filter(Boolean)
      .map((label) => ({ label, kind: "pointer" }));
  }
  return [];
}

export function getGedcomCompletions(
  context: CompletionContext,
): GedcomCompletion[] {
  const prefix = context.lineText.slice(0, context.position.character);
  const tagMatch = TAG_PREFIX.exec(prefix);
  if (tagMatch) {
    return completeTags(context, Number(tagMatch[1]));
  }
  const valueMatch = VALUE_PREFIX.exec(prefix);
  if (valueMatch) {
    return completeValues(context, Number(valueMatch[1]), valueMatch[2]);
  }
  return [];
}
