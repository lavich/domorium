import { TokenNames, type ASTNode } from "gedcom-validator";
import type {
  Position,
  ReferenceEntry,
  ReferenceOccurrence,
} from "../../types";
import { isPositionInRange } from "../position/position";

export class ReferenceIndex {
  private readonly byId = new Map<string, ReferenceEntry>();
  private readonly occurrences: ReferenceOccurrence[] = [];

  constructor(
    nodes: ASTNode[],
    private readonly getPointerTargetTag: (
      node: ASTNode,
    ) => string | undefined = () => undefined,
    private readonly isValidDeclaration: (node: ASTNode) => boolean = (node) =>
      node.level === 0 && !node.parent,
  ) {
    for (const node of nodes) {
      this.visit(node, node.tokens[TokenNames.TAG]?.value);
    }
  }

  at(position: Position): ReferenceOccurrence | undefined {
    return this.occurrences.find((occurrence) =>
      isPositionInRange(position, occurrence.range),
    );
  }

  get(id: string): ReferenceEntry | undefined {
    return this.byId.get(id);
  }

  entries(): IterableIterator<ReferenceEntry> {
    return this.byId.values();
  }

  private visit(node: ASTNode, recordTag?: string): void {
    const fieldTag = node.tokens[TokenNames.TAG]?.value;
    const declaration = node.tokens[TokenNames.POINTER];
    const usage = node.tokens[TokenNames.XREF];

    if (fieldTag && declaration && this.isValidDeclaration(node)) {
      this.add({
        id: declaration.value,
        role: "declaration",
        range: declaration.range,
        recordTag: fieldTag,
        fieldTag,
      });
    }

    if (fieldTag && usage && this.getPointerTargetTag(node)) {
      this.add({
        id: usage.value,
        role: "usage",
        range: usage.range,
        recordTag,
        fieldTag,
      });
    }

    const childRecordTag =
      node.level === 0 && fieldTag !== undefined ? fieldTag : recordTag;
    for (const child of node.children) {
      this.visit(child, childRecordTag);
    }
  }

  private add(occurrence: ReferenceOccurrence): void {
    let entry = this.byId.get(occurrence.id);
    if (!entry) {
      entry = {
        id: occurrence.id,
        declarations: [],
        usages: [],
      };
      this.byId.set(occurrence.id, entry);
    }

    if (occurrence.role === "declaration") {
      entry.declarations.push(occurrence);
    } else {
      entry.usages.push(occurrence);
    }
    this.occurrences.push(occurrence);
  }
}
