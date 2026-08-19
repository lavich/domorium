import {
  GedcomDocument,
  type ASTNode,
  type GedcomDialect,
} from "@domorium/validator";
import type {
  CodeAction,
  Diagnostic,
  DocumentVersion,
  EditRefusal,
  Range,
} from "../../types";
import type { ReferenceIndex } from "../references/referenceIndex";
import { lines } from "../position/lineTerminators";
import { recordLabel } from "../symbols/recordLabel";
import { nearestXref } from "./nearestXref";

/** The pointer 7.0 provides for a target deliberately left out. */
const VOID_POINTER = "@VOID@";

interface CodeActionContext {
  text: string;
  index: ReferenceIndex;
  currentDiagnostics: Diagnostic[];
  version: DocumentVersion;
  dialect: GedcomDialect | undefined;
  nodes: ASTNode[];
}

export function getCodeActions(
  context: CodeActionContext,
  range: Range,
  requestedDiagnostics: Diagnostic[],
  expectedVersion: DocumentVersion,
): CodeAction[] | EditRefusal {
  if (expectedVersion !== context.version) {
    return {
      ok: false,
      code: "stale-document",
      message: "The document changed before the quick fix could be applied.",
    };
  }

  const diagnostics = requestedDiagnostics.filter(
    (requested) =>
      overlaps(requested.range, range) &&
      context.currentDiagnostics.some((current) =>
        sameDiagnostic(current, requested),
      ),
  );

  return diagnostics.flatMap((diagnostic) => {
    if (diagnostic.code === "unresolved-xref") {
      return unresolvedXrefActions(context, diagnostic);
    }
    if (
      diagnostic.code === "invalid-level" &&
      diagnostic.data?.expectedLevel !== undefined &&
      isSafeLevelFix(context.text, diagnostic)
    ) {
      return [
        {
          title: `Change level to ${diagnostic.data.expectedLevel}`,
          kind: "quickfix" as const,
          diagnostics: [diagnostic],
          edit: {
            version: context.version,
            edits: [
              {
                range: diagnostic.range,
                newText: String(diagnostic.data.expectedLevel),
              },
            ],
          },
        },
      ];
    }
    return [];
  });
}

function unresolvedXrefActions(
  context: CodeActionContext,
  diagnostic: Diagnostic,
): CodeAction[] {
  const xref = diagnostic.data?.xref;
  const recordTag = diagnostic.data?.requiredRecordTag;
  if (!xref || !recordTag) {
    return [];
  }

  const actions: CodeAction[] = [];

  // The author wrote an identifier for a record they mean to have, so this
  // reads their intent where a replacement can only guess at it. See #249.
  const trailerLine = lines(context.text).findIndex((line) =>
    /^0\s+TRLR(?:\s|$)/u.test(line),
  );
  if (
    trailerLine >= 0 &&
    !context.index.get(xref)?.declarations.length &&
    canCreateBareRecord(context.dialect, recordTag)
  ) {
    const newline = terminatorOf(context.text);
    actions.push({
      title: `Create ${recordTag} record ${xref}`,
      kind: "quickfix",
      diagnostics: [diagnostic],
      edit: {
        version: context.version,
        edits: [
          {
            range: {
              start: { line: trailerLine, character: 0 },
              end: { line: trailerLine, character: 0 },
            },
            newText: `0 ${xref} ${recordTag}${newline}`,
          },
        ],
      },
    });
  }

  const candidates = Array.from(context.index.entries())
    .filter(({ declarations }) => declarations.length === 1)
    .map(({ declarations }) => declarations[0])
    .filter((declaration) => declaration.recordTag === recordTag)
    .map((declaration) => declaration.id);
  const candidate = nearestXref(xref, candidates);
  if (candidate) {
    const label = labelOf(context.nodes, candidate);
    actions.push({
      title: label
        ? `Replace with ${candidate} — ${label}`
        : `Replace with ${candidate}`,
      kind: "quickfix",
      diagnostics: [diagnostic],
      edit: replacementEdit(context.version, diagnostic.range, candidate),
    });
  }

  // Last: it is the one action that discards the identifier the author wrote.
  if (context.dialect === "7.0") {
    actions.push({
      title: `Point at nothing (${VOID_POINTER})`,
      kind: "quickfix",
      diagnostics: [diagnostic],
      edit: replacementEdit(context.version, diagnostic.range, VOID_POINTER),
    });
  }

  return actions;
}

/** Reached only once a candidate is worth naming, so the map is built here. */
function labelOf(nodes: ASTNode[], xref: string): string | undefined {
  const byXref = new Map(
    nodes.map((node) => [node.tokens.POINTER?.value ?? "", node]),
  );
  const record = byXref.get(xref);
  return record && recordLabel(record, (target) => byXref.get(target));
}

/** The four 5.5.1 allows, longest first, so a two-character form wins. See #251. */
function terminatorOf(text: string): string {
  return ["\r\n", "\n\r", "\r", "\n"].find((eol) => text.includes(eol)) ?? "\n";
}

function canCreateBareRecord(
  dialect: GedcomDialect | undefined,
  recordTag: string,
): boolean {
  if (dialect === undefined) {
    return false;
  }
  const allowed =
    dialect === "5.5.1"
      ? new Set(["FAM", "INDI", "SOUR", "SUBN"])
      : new Set(["FAM", "INDI", "SOUR"]);
  return allowed.has(recordTag);
}

function replacementEdit(
  version: DocumentVersion,
  range: Range,
  newText: string,
) {
  return { version, edits: [{ range, newText }] };
}

function sameDiagnostic(left: Diagnostic, right: Diagnostic): boolean {
  return (
    left.code === right.code &&
    left.message === right.message &&
    JSON.stringify(left.range) === JSON.stringify(right.range) &&
    JSON.stringify(left.data) === JSON.stringify(right.data)
  );
}

function overlaps(left: Range, right: Range): boolean {
  return (
    comparePosition(left.end, right.start) > 0 &&
    comparePosition(right.end, left.start) > 0
  );
}

function isSafeLevelFix(text: string, diagnostic: Diagnostic): boolean {
  const expectedLevel = diagnostic.data?.expectedLevel;
  if (expectedLevel === undefined) {
    return false;
  }
  const documentLines = lines(text);
  const line = documentLines[diagnostic.range.start.line];
  if (line === undefined) {
    return false;
  }
  documentLines[diagnostic.range.start.line] =
    line.slice(0, diagnostic.range.start.character) +
    String(expectedLevel) +
    line.slice(diagnostic.range.end.character);

  return !new GedcomDocument()
    .createDocument(documentLines.join(terminatorOf(text)))
    .getErrors()
    .some((error) => error.range.start.line === diagnostic.range.start.line);
}

function comparePosition(
  left: { line: number; character: number },
  right: { line: number; character: number },
): number {
  return left.line - right.line || left.character - right.character;
}
