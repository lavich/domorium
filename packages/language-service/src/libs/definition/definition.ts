import type { ASTNode } from "@domorium/validator";
import type { Position, Range } from "../../types";
import { ReferenceIndex } from "../references/referenceIndex";

export const findDefinitionRanges = (
  nodes: ASTNode[],
  _pointers: Map<string, ASTNode[]>,
  position: Position,
): Range[] => {
  const index = new ReferenceIndex(nodes);
  const occurrence = index.at(position);
  if (!occurrence) {
    return [];
  }
  return (index.get(occurrence.id)?.declarations ?? []).map(
    ({ range }) => range,
  );
};
