import {
  resolveValue,
  unescapePayload,
  type ASTNode,
  type GedcomDialect,
  type GedcomDocument,
  type StructureShape,
} from "@domorium/validator";

import type {
  DocumentVersion,
  EditRefusal,
  PointerCandidate,
  StructureDescription,
  StructureFieldDescription,
  StructureOccurrence,
} from "../../types";
import { hasReciprocal } from "./reciprocal";
import { lineRange, structurePath, subtreeEnd } from "./locate";

export interface DescribeContext {
  document: GedcomDocument;
  version: DocumentVersion;
  candidates: (tag: string) => PointerCandidate[];
}

export const refusal = (
  code: EditRefusal["code"],
  message: string,
): EditRefusal => ({ ok: false, code, message });

const isContinuation = (node: ASTNode): boolean => {
  const tag = node.tokens.TAG?.value;
  return tag === "CONT" || tag === "CONC";
};

function occurrenceOf(
  child: ASTNode,
  payloadKind: string,
  dialect: GedcomDialect,
): StructureOccurrence {
  const pointer = child.tokens.XREF?.value;
  const value =
    pointer ??
    unescapePayload(
      resolveValue(child),
      dialect,
      payloadKind as Parameters<typeof unescapePayload>[2],
    );
  return {
    value,
    range: lineRange(child),
    subtreeRange: {
      start: child.range.start,
      end: subtreeEnd(child).range.end,
    },
  };
}

export function describe(
  context: DescribeContext,
  dialect: GedcomDialect,
  shape: StructureShape,
  path: readonly string[],
  node?: ASTNode,
  extension = false,
): StructureDescription {
  const known = new Set(shape.fields.map((field) => field.tag));
  const fields: StructureFieldDescription[] = shape.fields.map((field) => {
    const pointsTo =
      field.payload.kind === "pointer" ||
      field.payload.kind === "text-or-pointer"
        ? field.payload.to
        : undefined;
    return {
      id: `${path.join(".")}.${field.tag}`,
      schemaId: field.schemaId,
      tag: field.tag,
      required: field.min >= 1,
      min: field.min,
      max: field.max,
      payload: field.payload,
      payloadRequired: field.payloadRequired,
      lineBreaks: field.lineBreaks,
      prose: field.prose,
      reciprocal: pointsTo !== undefined && hasReciprocal(path, field.tag),
      ...(pointsTo === undefined
        ? {}
        : { candidates: context.candidates(pointsTo) }),
      occurrences: (node?.children ?? [])
        .filter((child) => child.tokens.TAG?.value === field.tag)
        .map((child) => occurrenceOf(child, field.payload.kind, dialect)),
    };
  });

  const undefinedOccurrences = (node?.children ?? [])
    .filter((child) => {
      const tag = child.tokens.TAG?.value;
      return tag !== undefined && !known.has(tag) && !isContinuation(child);
    })
    .map((child) => ({
      tag: child.tokens.TAG?.value ?? "",
      ...occurrenceOf(child, "text", dialect),
    }));

  return {
    id: path.join("."),
    tag: path[path.length - 1],
    schemaId: shape.schemaId,
    version: context.version,
    ...(node
      ? {
          range: lineRange(node),
          subtreeRange: {
            start: node.range.start,
            end: subtreeEnd(node).range.end,
          },
          value: occurrenceOf(node, shape.payload.kind, dialect).value,
        }
      : {}),
    payload: shape.payload,
    payloadRequired: shape.payloadRequired,
    lineBreaks: shape.lineBreaks,
    prose: shape.prose,
    extension,
    fields,
    undefinedOccurrences,
  };
}

export const EXTENSION_SHAPE: StructureShape = {
  schemaId: "",
  payload: { kind: "text" },
  payloadRequired: false,
  lineBreaks: true,
  prose: false,
  fields: [],
};

export { structurePath };
