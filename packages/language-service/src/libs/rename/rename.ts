import type {
  DocumentVersion,
  EditRefusal,
  Position,
  PrepareRenameResult,
  WorkspaceEditResult,
} from "../../types";
import type { ReferenceIndex } from "../references/referenceIndex";

const XREF_ID = /^@[A-Za-z0-9_]+@$/u;

const refusal = (
  code: EditRefusal["code"],
  message: string,
): EditRefusal => ({ ok: false, code, message });

export function prepareRename(
  index: ReferenceIndex,
  position: Position,
  version: DocumentVersion,
): PrepareRenameResult | EditRefusal {
  const occurrence = index.at(position);
  if (!occurrence) {
    return refusal("not-xref", "The cursor is not on a GEDCOM XREF.");
  }
  const entry = index.get(occurrence.id);
  if (!entry || entry.declarations.length === 0) {
    return refusal(
      "unresolved-declaration",
      `No declaration exists for ${occurrence.id}.`,
    );
  }
  if (entry.declarations.length > 1) {
    return refusal(
      "duplicate-declaration",
      `More than one declaration exists for ${occurrence.id}.`,
    );
  }
  return {
    ok: true,
    range: occurrence.range,
    placeholder: occurrence.id,
    version,
  };
}

export function rename(
  index: ReferenceIndex,
  position: Position,
  newName: string,
  expectedVersion: DocumentVersion,
  version: DocumentVersion,
): WorkspaceEditResult | EditRefusal {
  if (expectedVersion !== version) {
    return refusal(
      "stale-document",
      "The document changed before the rename could be applied.",
    );
  }
  const prepared = prepareRename(index, position, version);
  if (!prepared.ok) {
    return prepared;
  }
  if (!XREF_ID.test(newName)) {
    return refusal(
      "invalid-new-id",
      "GEDCOM XREF identifiers must use the form @identifier@.",
    );
  }
  if (
    newName !== prepared.placeholder &&
    (index.get(newName)?.declarations.length ?? 0) > 0
  ) {
    return refusal(
      "identifier-collision",
      `A declaration for ${newName} already exists.`,
    );
  }

  const entry = index.get(prepared.placeholder)!;
  const edits =
    newName === prepared.placeholder
      ? []
      : [...entry.declarations, ...entry.usages]
          .sort(
            (left, right) =>
              left.range.start.line - right.range.start.line ||
              left.range.start.character - right.range.start.character,
          )
          .map(({ range }) => ({ range, newText: newName }));

  return { ok: true, edit: { version, edits } };
}
