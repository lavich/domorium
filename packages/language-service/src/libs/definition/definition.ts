import type { Position, Range } from "../../types";
import { ReferenceIndex } from "../references/referenceIndex";

export const findDefinitionRanges = (
  index: ReferenceIndex,
  position: Position,
): Range[] => {
  const occurrence = index.at(position);
  if (!occurrence) {
    return [];
  }
  return (index.get(occurrence.id)?.declarations ?? []).map(
    ({ range }) => range,
  );
};
