import {
  GedcomDocument,
  type ASTNode,
  type CreateDocumentOptions,
  type GedcomDialect,
  type PayloadKind,
  type StructureField,
} from "@domorium/validator";

import type {
  Diagnostic,
  DocumentVersion,
  EditRefusal,
  Position,
  StructureChildInput,
  StructureEditResult,
  StructureInput,
  StructureValueInput,
  TextEdit,
} from "../../types";
import { LINE_TERMINATOR, terminatorOf } from "../position/lineTerminators";
import { applied } from "./applied";
import { refusal } from "./describe";
import { lineRange, structureAt, structurePath, subtreeEnd } from "./locate";
import { policyFor } from "./policies";
import { hasReciprocal } from "./reciprocal";
import { refusalCodeOf, refuses } from "./refusalCodes";
import { writeValueLines } from "./write";

export interface EditContext {
  text: string;
  version: DocumentVersion;
  document: GedcomDocument;
  options: CreateDocumentOptions;
  diagnostics: () => Diagnostic[];
}

const isContinuation = (node: ASTNode): boolean => {
  const tag = node.tokens.TAG?.value;
  return tag === "CONT" || tag === "CONC";
};

function gate(
  context: EditContext,
  expectedVersion: DocumentVersion,
): GedcomDialect | EditRefusal {
  if (expectedVersion !== context.version) {
    return refusal(
      "stale-document",
      "The document changed before the edit could be applied.",
    );
  }
  return (
    context.document.getValidatedDialect() ??
    refusal("no-dialect", "The document was checked against no dialect.")
  );
}

function fieldOf(
  document: GedcomDocument,
  parentPath: readonly string[],
  tag: string,
): StructureField | undefined {
  return document
    .getStructureShapeAtPath(parentPath)
    ?.fields.find((field) => field.tag === tag);
}

export function fieldKind(
  document: GedcomDocument,
  parentPath: readonly string[],
  tag: string,
): PayloadKind["kind"] {
  return fieldOf(document, parentPath, tag)?.payload.kind ?? "text";
}

// 5.5.1 continues an address with CONT alone, and a value its grammar does not
// continue with CONC at all.
function concatenates(
  field: { lineBreaks: boolean } | undefined,
  tag: string,
): boolean {
  return field?.lineBreaks !== false && tag !== "ADDR";
}

export function recordShape(
  document: GedcomDocument,
  record: ASTNode,
): { payload: PayloadKind; lineBreaks: boolean } | undefined {
  const shape = document.getStructureShape(record);
  if (shape) {
    return shape;
  }
  return record.tokens.TAG?.value.startsWith("_")
    ? { payload: { kind: "text" }, lineBreaks: true }
    : undefined;
}

const CHECKED_BEFORE_WRITING = new Set([
  "VAL017",
  "VAL018",
  "VAL019",
  "VAL020",
]);

function checkRefusal(
  document: GedcomDocument,
  parent: ASTNode | readonly string[],
  tag: string,
  raw: string,
  replacing?: ASTNode,
): EditRefusal | undefined {
  const problem = document
    .checkPayload(parent, tag, raw, replacing)
    ?.find((candidate) => CHECKED_BEFORE_WRITING.has(candidate.code));
  return problem
    ? {
        ...refusal(refusalCodeOf(problem.code), problem.message),
        diagnosticCode: problem.code,
        ...(problem.data ? { data: problem.data } : {}),
      }
    : undefined;
}

function inputRefusal(
  document: GedcomDocument,
  parent: ASTNode | readonly string[],
  parentPath: readonly string[],
  tag: string,
  input: StructureInput,
): EditRefusal | undefined {
  const field = fieldOf(document, parentPath, tag);
  const { raw } = payloadOf(input, field?.payload.kind ?? "text");
  const refused = checkRefusal(document, parent, tag, raw);
  if (refused) {
    return refused;
  }
  const path = [...parentPath, tag];
  for (const child of input.children ?? []) {
    const childRefused = inputRefusal(document, path, path, child.tag, child);
    if (childRefused) {
      return childRefused;
    }
  }
  return undefined;
}

export function payloadOf(
  input: StructureValueInput,
  kind: PayloadKind["kind"],
): { raw: string; kind: PayloadKind["kind"] } {
  if (kind === "pointer") {
    return { raw: input.pointer ?? input.value ?? "", kind };
  }
  if (kind === "text-or-pointer") {
    return input.pointer !== undefined
      ? { raw: input.pointer, kind: "pointer" }
      : { raw: input.value ?? "", kind: "text" };
  }
  return { raw: input.value ?? input.pointer ?? "", kind };
}

function linesOf(
  context: EditContext,
  dialect: GedcomDialect,
  parentPath: readonly string[],
  level: number,
  tag: string,
  input: StructureInput,
  terminator: string,
): string[] {
  const field = fieldOf(context.document, parentPath, tag);
  const { raw, kind } = payloadOf(input, field?.payload.kind ?? "text");
  return [
    ...writeValueLines(
      level,
      tag,
      raw,
      kind,
      dialect,
      terminator,
      concatenates(field, tag),
    ),
    ...(input.children ?? []).flatMap((child: StructureChildInput) =>
      linesOf(
        context,
        dialect,
        [...parentPath, tag],
        level + 1,
        child.tag,
        child,
        terminator,
      ),
    ),
  ];
}

function reciprocalIn(
  path: readonly string[],
  tag: string,
  input: StructureInput,
): boolean {
  return (
    hasReciprocal(path, tag) ||
    (input.children ?? []).some((child) =>
      reciprocalIn([...path, tag], child.tag, child),
    )
  );
}

function reciprocalBeneath(node: ASTNode): boolean {
  const path = structurePath(node);
  return (
    hasReciprocal(path.slice(0, -1), path[path.length - 1]) ||
    node.children.some(reciprocalBeneath)
  );
}

const reciprocalRefusal = () =>
  refusal(
    "reciprocal-pointer-unsupported",
    "A pointer the standard pairs with one on the other record cannot be written on one side only.",
  );

function insertAfter(
  text: string,
  end: Position,
  lines: string[],
  terminator: string,
): TextEdit {
  const all = text.split(LINE_TERMINATOR);
  const next = end.line + 1;
  return next < all.length
    ? {
        range: {
          start: { line: next, character: 0 },
          end: { line: next, character: 0 },
        },
        newText: lines.join(terminator) + terminator,
      }
    : {
        range: { start: end, end },
        newText: terminator + lines.join(terminator),
      };
}

function removeLines(
  text: string,
  startLine: number,
  endLine: number,
): TextEdit {
  const all = text.split(LINE_TERMINATOR);
  if (endLine + 1 < all.length) {
    return {
      range: {
        start: { line: startLine, character: 0 },
        end: { line: endLine + 1, character: 0 },
      },
      newText: "",
    };
  }
  return {
    range: {
      start:
        startLine > 0
          ? { line: startLine - 1, character: all[startLine - 1].length }
          : { line: 0, character: 0 },
      end: { line: endLine, character: all[endLine].length },
    },
    newText: "",
  };
}

const toDiagnostic = (error: { level: Diagnostic["severity"] }): Diagnostic =>
  ({ ...(error as object), severity: error.level }) as Diagnostic;

function countByCode(diagnostics: Diagnostic[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const diagnostic of diagnostics) {
    counts.set(diagnostic.code, (counts.get(diagnostic.code) ?? 0) + 1);
  }
  return counts;
}

function verify(
  context: EditContext,
  edits: TextEdit[],
  scope: ASTNode,
): StructureEditResult | EditRefusal {
  const result = applied(context.text, edits);
  const next = new GedcomDocument()
    .createDocument(result.text, context.options)
    .getErrors()
    .map(toDiagnostic);
  const whole = structurePath(scope)[0] === "HEAD";
  const first = scope.range.start.line;
  const oldLast = subtreeEnd(scope).range.end.line;
  const within = (last: number) => (diagnostic: Diagnostic) =>
    whole ||
    (diagnostic.range.start.line >= first &&
      diagnostic.range.start.line <= last);
  const before = countByCode(context.diagnostics().filter(within(oldLast)));
  const after = next.filter(within(oldLast + result.lineDelta));
  const grown = countByCode(after);

  const fresh = new Set<Diagnostic>(
    after.filter(
      (diagnostic) =>
        diagnostic.code !== "VAL002" &&
        result.writtenLines.has(diagnostic.range.start.line),
    ),
  );
  for (const [code, count] of grown) {
    let extra = count - (before.get(code) ?? 0);
    for (let index = after.length - 1; index >= 0 && extra > 0; index--) {
      if (after[index].code === code && !fresh.has(after[index])) {
        fresh.add(after[index]);
        extra--;
      }
    }
  }

  const ordered = after.filter((diagnostic) => fresh.has(diagnostic));
  const blocking = ordered.find(refuses);
  if (blocking) {
    return {
      ...refusal(refusalCodeOf(blocking.code), blocking.message),
      diagnosticCode: blocking.code,
      ...(blocking.data ? { data: blocking.data } : {}),
    };
  }
  return {
    ok: true,
    edit: { version: context.version, edits },
    warnings: ordered,
  };
}

export function addStructure(
  context: EditContext,
  position: Position,
  tag: string,
  input: StructureInput,
  expectedVersion: DocumentVersion,
): StructureEditResult | EditRefusal {
  const dialect = gate(context, expectedVersion);
  if (typeof dialect !== "string") {
    return dialect;
  }
  const parent = structureAt(context.document.getNodes(), position.line);
  if (!parent) {
    return refusal("not-a-structure", "There is no structure on that line.");
  }
  const parentPath = structurePath(parent);
  if (reciprocalIn(parentPath, tag, input)) {
    return reciprocalRefusal();
  }
  const broken = inputRefusal(context.document, parent, parentPath, tag, input);
  if (broken) {
    return broken;
  }
  const terminator = terminatorOf(context.text);
  const lines = linesOf(
    context,
    dialect,
    parentPath,
    parent.level + 1,
    tag,
    policyFor([...parentPath, tag])?.onAdd?.(input) ?? input,
    terminator,
  );
  const sameTag = parent.children.filter(
    (child) => child.tokens.TAG?.value === tag,
  );
  const anchor = subtreeEnd(sameTag[sameTag.length - 1] ?? parent);
  const edits = [
    insertAfter(context.text, anchor.range.end, lines, terminator),
  ];
  return verify(context, edits, parent);
}

export function setValue(
  context: EditContext,
  position: Position,
  value: StructureValueInput,
  expectedVersion: DocumentVersion,
): StructureEditResult | EditRefusal {
  const dialect = gate(context, expectedVersion);
  if (typeof dialect !== "string") {
    return dialect;
  }
  const node = structureAt(context.document.getNodes(), position.line);
  if (!node) {
    return refusal("not-a-structure", "There is no structure on that line.");
  }
  const tag = node.tokens.TAG?.value ?? "";
  const parent = node.parent;
  const path = parent ? structurePath(parent) : [];
  if (parent && hasReciprocal(path, tag)) {
    return reciprocalRefusal();
  }
  const field = parent
    ? fieldOf(context.document, path, tag)
    : recordShape(context.document, node);
  const { raw, kind } = payloadOf(value, field?.payload.kind ?? "text");
  const refused = checkRefusal(context.document, parent ?? [], tag, raw, node);
  if (refused) {
    return refused;
  }
  const terminator = terminatorOf(context.text);
  const pointer = node.tokens.POINTER?.value;
  const head = !parent && pointer ? `${pointer} ${tag}` : tag;
  const lines = writeValueLines(
    node.level,
    head,
    raw,
    kind,
    dialect,
    terminator,
    concatenates(field, tag),
  );

  let leading = 0;
  while (
    leading < node.children.length &&
    isContinuation(node.children[leading])
  ) {
    leading++;
  }
  const end = lineRange(leading > 0 ? node.children[leading - 1] : node).end;
  const edits: TextEdit[] = [
    {
      range: { start: node.range.start, end },
      newText: lines.join(terminator),
    },
    ...(parent ? (policyFor(path)?.onSet?.(parent, node, raw) ?? []) : []),
    ...node.children
      .slice(leading)
      .filter(isContinuation)
      .map((stray) =>
        removeLines(
          context.text,
          stray.range.start.line,
          stray.range.start.line,
        ),
      ),
  ];
  return verify(context, edits, parent ?? node);
}

export function removeStructure(
  context: EditContext,
  position: Position,
  expectedVersion: DocumentVersion,
): StructureEditResult | EditRefusal {
  const dialect = gate(context, expectedVersion);
  if (typeof dialect !== "string") {
    return dialect;
  }
  const node = structureAt(context.document.getNodes(), position.line);
  if (!node) {
    return refusal("not-a-structure", "There is no structure on that line.");
  }
  if (!node.parent) {
    return refusal(
      "record-edit-unsupported",
      "A whole record is not removed as a structure.",
    );
  }
  if (reciprocalBeneath(node)) {
    return reciprocalRefusal();
  }
  const edits = [
    removeLines(
      context.text,
      node.range.start.line,
      subtreeEnd(node).range.end.line,
    ),
  ];
  return verify(context, edits, node.parent);
}
