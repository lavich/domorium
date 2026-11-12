import { GedcomDocument, type ASTNode } from "@domorium/validator";

import type {
  DocumentVersion,
  EditRefusal,
  MoveDescription,
  MoveSlot,
  MoveTarget,
  Position,
  Range,
  StructureEditResult,
  TextEdit,
} from "../../types";
import { applyEdits, lineStarts } from "../position/applyEdits";
import { LINE_TERMINATOR, lines } from "../position/lineTerminators";
import { refusal } from "./describe";
import { gate, isContinuation, removeLines, type EditContext } from "./edit";
import { lineRange, structureAt, subtreeEnd } from "./locate";

interface Placed {
  node: ASTNode;
  siblings: ASTNode[];
  index: number;
}

const isStructureLine = (node: ASTNode): boolean =>
  node.tokens.LEVEL !== undefined &&
  node.tokens.TAG !== undefined &&
  !isContinuation(node);

function place(context: EditContext, position: Position): Placed | EditRefusal {
  const node = structureAt(context.document.getNodes(), position.line);
  if (!node || !isStructureLine(node)) {
    return refusal("not-a-structure", "There is no structure on that line.");
  }
  const parent = node.parent;
  if (!parent) {
    return refusal(
      "record-edit-unsupported",
      "A line at the top level is not moved as a structure.",
    );
  }
  if (!isStructureLine(parent)) {
    return refusal(
      "not-a-structure",
      "The line holding that structure is not a structure.",
    );
  }
  const siblings = parent.children.filter(isStructureLine);
  return { node, siblings, index: siblings.indexOf(node) };
}

function slotsOf({ siblings, index }: Placed): MoveSlot[] {
  return [
    ...siblings.map((sibling, at) => ({
      target: { before: sibling.range.start },
      changesOrder: at !== index && at !== index + 1,
    })),
    { target: { end: true }, changesOrder: index !== siblings.length - 1 },
  ];
}

function subtreeRangeOf(node: ASTNode): Range {
  return { start: node.range.start, end: subtreeEnd(node).range.end };
}

export function describeMove(
  context: EditContext,
  position: Position,
): MoveDescription | EditRefusal {
  if (!context.document.getValidatedDialect()) {
    return refusal(
      "no-dialect",
      "The document was checked against no dialect.",
    );
  }
  const placed = place(context, position);
  if (!("node" in placed)) {
    return placed;
  }
  return {
    ok: true,
    version: context.version,
    range: lineRange(placed.node),
    subtreeRange: subtreeRangeOf(placed.node),
    slots: slotsOf(placed),
  };
}

function slotIndex(
  context: EditContext,
  placed: Placed,
  target: MoveTarget,
): number | undefined {
  if ("end" in target) {
    return target.end === true ? placed.siblings.length : undefined;
  }
  if (typeof target.before?.line !== "number") {
    return undefined;
  }
  const sibling = structureAt(context.document.getNodes(), target.before.line);
  const at = sibling ? placed.siblings.indexOf(sibling) : -1;
  return at === -1 ? undefined : at;
}

const TRAILING_TERMINATOR = new RegExp(`(${LINE_TERMINATOR.source})$`, "u");

function nextNodeLine(node: ASTNode, roots: ASTNode[]): number | undefined {
  for (let step: ASTNode | undefined = node; step; step = step.parent) {
    const level = step.parent?.children ?? roots;
    const next = level[level.indexOf(step) + 1];
    if (next) {
      return next.range.start.line;
    }
  }
  return undefined;
}

// A line the lexer could not read has no node, yet belongs to the subtree it
// stands in; a blank line may only separate records, so it does not.
function lastLine(node: ASTNode, roots: ASTNode[], all: string[]): number {
  let last = subtreeEnd(node).range.end.line;
  const bound = nextNodeLine(node, roots) ?? last + 1;
  while (last + 1 < bound && all[last + 1].trim() !== "") {
    last++;
  }
  return last;
}

function moveEdits(
  text: string,
  roots: ASTNode[],
  placed: Placed,
  slot: number,
): TextEdit[] {
  const starts = lineStarts(text);
  const all = lines(text);
  const first = placed.node.range.start.line;
  const last = lastLine(placed.node, roots, all);
  const block = text.slice(starts[first], starts[last + 1] ?? text.length);
  const removal = removeLines(text, first, last);

  const ended = TRAILING_TERMINATOR.test(block)
    ? block
    : block +
      text.slice(starts[first - 1] + all[first - 1].length, starts[first]);
  const insertAt = (line: number): TextEdit => ({
    range: {
      start: { line, character: 0 },
      end: { line, character: 0 },
    },
    newText: ended,
  });

  const sibling = placed.siblings[slot];
  if (sibling) {
    return [removal, insertAt(sibling.range.start.line)];
  }
  const end = lastLine(placed.siblings[placed.siblings.length - 1], roots, all);
  if (end + 1 < starts.length) {
    return [removal, insertAt(end + 1)];
  }
  const terminator = block.match(TRAILING_TERMINATOR)?.[0] ?? "";
  const at = { line: end, character: all[end].length };
  return [
    removal,
    {
      range: { start: at, end: at },
      newText: terminator + block.slice(0, block.length - terminator.length),
    },
  ];
}

function firstDifference<T>(
  before: T[],
  after: T[],
  key: (item: T) => string,
): T | undefined {
  const remaining = new Map<string, number>();
  for (const item of before) {
    remaining.set(key(item), (remaining.get(key(item)) ?? 0) + 1);
  }
  let added: T | undefined;
  for (const item of after) {
    const left = remaining.get(key(item)) ?? 0;
    if (left === 0) {
      added ??= item;
    } else {
      remaining.set(key(item), left - 1);
    }
  }
  return added ?? before.find((item) => (remaining.get(key(item)) ?? 0) > 0);
}

function extensionReadings(document: GedcomDocument): string[] {
  const readings: string[] = [];
  const visit = (nodes: ASTNode[]) => {
    for (const node of nodes) {
      const tag = node.tokens.TAG?.value;
      if (tag?.startsWith("_")) {
        readings.push(`${tag} ${document.getLabel(node) ?? ""}`);
      }
      visit(node.children);
    }
  };
  visit(document.getNodes());
  return readings;
}

function readingChange(
  context: EditContext,
  text: string,
): EditRefusal | undefined {
  const before = context.document;
  const after = new GedcomDocument().createDocument(text, context.options);
  const unread = refusal(
    "reading-changed",
    "The move would change how the document is read.",
  );
  const changed = firstDifference(
    before.getErrors(),
    after.getErrors(),
    (error) => `${error.code}\u0000${error.message}`,
  );
  if (changed) {
    return { ...unread, diagnosticCode: changed.code };
  }
  const same =
    before.getVersionResolution()?.kind ===
      after.getVersionResolution()?.kind &&
    before.getValidatedDialect() === after.getValidatedDialect() &&
    firstDifference(
      extensionReadings(before),
      extensionReadings(after),
      (reading) => reading,
    ) === undefined;
  return same ? undefined : unread;
}

export function moveStructure(
  context: EditContext,
  position: Position,
  target: MoveTarget,
  expectedVersion: DocumentVersion,
): StructureEditResult | EditRefusal {
  const dialect = gate(context, expectedVersion);
  if (typeof dialect !== "string") {
    return dialect;
  }
  const placed = place(context, position);
  if (!("node" in placed)) {
    return placed;
  }
  const slot = slotIndex(context, placed, target);
  if (slot === undefined) {
    return refusal(
      "not-a-sibling",
      "The target is not a sibling of the structure.",
    );
  }
  const edits = slotsOf(placed)[slot].changesOrder
    ? moveEdits(context.text, context.document.getNodes(), placed, slot)
    : [];
  const changed =
    edits.length > 0
      ? readingChange(context, applyEdits(context.text, edits))
      : undefined;
  return (
    changed ?? {
      ok: true,
      edit: { version: context.version, edits },
      warnings: [],
    }
  );
}
