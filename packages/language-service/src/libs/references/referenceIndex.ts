import { TokenNames, type ASTNode, type ASTToken } from "@domorium/validator";
import type {
  Position,
  Range,
  ReferenceEntry,
  ReferenceOccurrence,
  ReferenceRole,
} from "../../types";
import { comparePositions, isPositionInRange } from "../position/position";

/**
 * Holds the token rather than a materialized range. The token is already
 * retained by the syntax tree, so this costs one reference; a stored range
 * costs three objects per occurrence, and a document of 200k individuals has
 * on the order of a million of them.
 */
class Occurrence implements ReferenceOccurrence {
  constructor(
    readonly id: string,
    readonly role: ReferenceRole,
    readonly fieldTag: string,
    readonly recordTag: string | undefined,
    private readonly token: ASTToken,
  ) {}

  get range(): Range {
    return this.token.range;
  }
}

export class ReferenceIndex {
  private readonly byId = new Map<string, ReferenceEntry>();
  private readonly occurrences: Occurrence[] = [];

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

  /**
   * Occurrences are appended by a pre-order walk, so they are already in
   * document order and cannot overlap. Finding the last one that starts at or
   * before the cursor, then testing that one for containment, answers the
   * question in log time — this runs on every cursor move.
   */
  at(position: Position): ReferenceOccurrence | undefined {
    let low = 0;
    let high = this.occurrences.length - 1;
    let candidate = -1;

    while (low <= high) {
      const middle = (low + high) >>> 1;
      if (
        comparePositions(this.occurrences[middle].range.start, position) <= 0
      ) {
        candidate = middle;
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }

    if (candidate < 0) {
      return undefined;
    }
    const occurrence = this.occurrences[candidate];
    return isPositionInRange(position, occurrence.range)
      ? occurrence
      : undefined;
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
      this.add(
        new Occurrence(
          declaration.value,
          "declaration",
          fieldTag,
          fieldTag,
          declaration,
        ),
      );
    }

    if (fieldTag && usage && this.getPointerTargetTag(node)) {
      this.add(
        new Occurrence(usage.value, "usage", fieldTag, recordTag, usage),
      );
    }

    const childRecordTag =
      node.level === 0 && fieldTag !== undefined ? fieldTag : recordTag;
    for (const child of node.children) {
      this.visit(child, childRecordTag);
    }
  }

  private add(occurrence: Occurrence): void {
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
