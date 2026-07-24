import type { GedcomCompletion, GedcomDocument } from "gedcom-validator";
import { CompletionItemKind, type CompletionItem, type Position } from "../../types";

const kinds: Record<GedcomCompletion["kind"], CompletionItemKind> = {
  tag: CompletionItemKind.Field,
  enum: CompletionItemKind.EnumMember,
  pointer: CompletionItemKind.Reference,
};

export function getCompletionItems(
  document: GedcomDocument,
  position: Position,
  lineText: string,
): CompletionItem[] {
  return document.getCompletions(position, lineText).map((item) => ({
    label: item.label,
    kind: kinds[item.kind],
    detail: item.detail,
  }));
}
