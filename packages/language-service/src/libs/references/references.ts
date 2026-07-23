import type {
  DocumentHighlight,
  Position,
  Range,
  ReferenceOptions,
} from "../../types";
import type { ReferenceIndex } from "./referenceIndex";

const compareRanges = (left: Range, right: Range): number =>
  left.start.line - right.start.line ||
  left.start.character - right.start.character;

export function getReferences(
  index: ReferenceIndex,
  position: Position,
  options: ReferenceOptions,
): Range[] {
  const occurrence = index.at(position);
  if (!occurrence) {
    return [];
  }

  const entry = index.get(occurrence.id);
  if (!entry) {
    return [];
  }

  return [
    ...(options.includeDeclaration ? entry.declarations : []),
    ...entry.usages,
  ]
    .map(({ range }) => range)
    .sort(compareRanges);
}

export function getDocumentHighlights(
  index: ReferenceIndex,
  position: Position,
): DocumentHighlight[] {
  const occurrence = index.at(position);
  if (!occurrence) {
    return [];
  }

  const entry = index.get(occurrence.id);
  if (!entry) {
    return [];
  }

  return [
    ...entry.declarations.map(({ range }) => ({
      range,
      kind: "write" as const,
    })),
    ...entry.usages.map(({ range }) => ({
      range,
      kind: "read" as const,
    })),
  ].sort((left, right) => compareRanges(left.range, right.range));
}
