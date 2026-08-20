import type { ASTNode } from "../parser";
import type { Position } from "../types/position";
import {
  GedcomTag,
  GedcomType,
  type GedcomScheme,
} from "../schemes/schema-types";
import { RuleNode } from "../validator/rule-node";
import { dateSlot, type DateGrammar } from "./dateSlot";
import type { ExtensionContext } from "../validator/extensions";

export interface GedcomCompletion {
  label: string;
  kind: "tag" | "enum" | "pointer";
  detail?: string;
}

interface CompletionContext {
  nodes: ASTNode[];
  pointers: Map<string, ASTNode[]>;
  scheme: GedcomScheme;
  extensions: ExtensionContext;
  isGedcom7: boolean;
  position: Position;
  lineText: string;
}

// The tag half matches what the lexer accepts as a tag, case and all: a tag
// written in lower case is read as that tag, and VAL001 names the mistake.
const TAG_PREFIX = /^(\d+)\s+(?:@[^\s@]+@\s+)?([A-Za-z0-9_]*)$/;
const VALUE_PREFIX = /^(\d+)\s+(?:@[^\s@]+@\s+)?([A-Za-z0-9_]+)\s+(.*)$/;

// A keystroke asks for completions again, and the tree it walks is the one the
// last parse built and never touched since. The walk is cached against that
// array, which a fresh parse replaces.
const flattened = new WeakMap<ASTNode[], ASTNode[]>();

function flattenNodes(nodes: ASTNode[]): ASTNode[] {
  const cached = flattened.get(nodes);
  if (cached) {
    return cached;
  }
  const flat: ASTNode[] = [];
  const walk = (level: ASTNode[]) => {
    for (const node of level) {
      flat.push(node);
      walk(node.children);
    }
  };
  walk(nodes);
  flattened.set(nodes, flat);
  return flat;
}

/**
 * The index of the last node beginning at or before `line`, or -1.
 *
 * One node is one line and the walk yields them in document order, so their
 * start lines ascend and the cursor's line is found by halving them. Reading
 * `range` allocates, so the fewer of them read the better.
 */
function lastNodeAtOrBefore(nodes: ASTNode[], line: number): number {
  let low = 0;
  let high = nodes.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (nodes[middle].range.start.line <= line) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low - 1;
}

function parseMax(cardinality: string): number | null {
  const match = /^\{\d+:(\d+|M)\}$/.exec(cardinality);
  if (!match) {
    return null;
  }
  return match[1] === "M" ? Infinity : Number(match[1]);
}

function hasValidAncestry(node: ASTNode, level: number): boolean {
  let current: ASTNode | undefined = node;
  let expectedLevel = level;
  while (current) {
    if (current.level !== expectedLevel || !current.tokens.TAG?.value) {
      return false;
    }
    current = current.parent;
    expectedLevel -= 1;
  }
  return expectedLevel === -1;
}

function resolveParent(context: CompletionContext, level: number) {
  if (level === 0) {
    return { parentType: GedcomType(""), siblings: context.nodes };
  }

  const nodes = flattenNodes(context.nodes);
  const last = lastNodeAtOrBefore(nodes, context.position.line);
  const current =
    last >= 0 && nodes[last].range.start.line === context.position.line
      ? nodes[last]
      : undefined;
  let parent: ASTNode | undefined;
  if (current) {
    if (current.level !== level || current.parent?.level !== level - 1) {
      return null;
    }
    parent = current.parent;
  } else {
    for (let index = last; index >= 0; index -= 1) {
      const node = nodes[index];
      if (node.level < level - 1) {
        return null;
      }
      if (node.level === level - 1) {
        parent = node;
        break;
      }
    }
  }
  if (!parent || !hasValidAncestry(parent, level - 1)) {
    return null;
  }

  const parentType = new RuleNode(context.scheme, context.pointers).getNodeType(
    parent,
  );
  // An empty type means the parent could not be resolved through the schema —
  // inside an extension subtree, for instance. substructure[""] is the root
  // context, so returning it here would suggest HEAD/INDI/TRLR mid-record.
  if (!parentType) {
    return null;
  }

  return { parentType, siblings: parent.children };
}

function completeTags(
  context: CompletionContext,
  level: number,
): GedcomCompletion[] {
  const parent = resolveParent(context, level);
  if (!parent) {
    return [];
  }

  const standardTags: GedcomCompletion[] = Object.entries(
    context.scheme.substructure[parent.parentType] ?? {},
  )
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

  // Extension tags are legal in any context.
  const extensionTags: GedcomCompletion[] = [...context.extensions.tags].map(
    ([label, uri]) => ({ label, kind: "tag", detail: uri }),
  );

  return [...standardTags, ...extensionTags];
}

const DATE_GRAMMARS: Record<string, DateGrammar> = {
  "date-v7": "value",
  date: "value",
  "date-period-v7": "period",
  "date-period": "period",
  "date-exact-v7": "exact",
  "date-exact": "exact",
};

/**
 * An extension calendar declared in HEAD.SCHMA is not offered: a declaration
 * says a tag has a URI, not that the tag names a calendar, so offering every
 * declared tag here would be noise where the point is a short, right list.
 */
function completeDate(
  context: CompletionContext,
  grammar: DateGrammar,
  typed: string,
): GedcomCompletion[] {
  const slot = dateSlot(typed, grammar);
  const calendar = (name: string | null) =>
    name === null ? undefined : context.scheme.calendar[GedcomTag(name)];

  return [
    ...(slot.calendars ? Object.keys(context.scheme.calendar) : []),
    ...Object.keys(calendar(slot.months)?.months ?? {}),
    ...(calendar(slot.epochs)?.epochs ?? []),
    ...slot.keywords,
  ].map((label) => ({ label, kind: "enum" }) as const);
}

function completeValues(
  context: CompletionContext,
  level: number,
  tag: string,
  typed: string,
): GedcomCompletion[] {
  const parent = resolveParent(context, level);
  if (!parent) {
    return [];
  }

  const childType =
    context.scheme.substructure[parent.parentType]?.[
      GedcomTag(tag.toUpperCase())
    ]?.type;
  if (!childType) {
    return [];
  }

  const ruleNode = new RuleNode(context.scheme, context.pointers);
  const fieldType = ruleNode.getFieldType(childType);
  const grammar =
    fieldType.type === null ? undefined : DATE_GRAMMARS[fieldType.type];
  if (grammar) {
    return completeDate(context, grammar, typed);
  }
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
    return completeValues(
      context,
      Number(valueMatch[1]),
      valueMatch[2],
      valueMatch[3],
    );
  }
  return [];
}
