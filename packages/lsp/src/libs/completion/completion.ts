import type { GedcomCompletion, GedcomDocument } from "@domorium/validator";
import type { CompletionItem, Position } from "vscode-languageserver";
import { CompletionItemKind } from "vscode-languageserver";

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
