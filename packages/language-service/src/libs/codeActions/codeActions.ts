import { GedcomDocument } from "gedcom-validator";
import type {
  CodeAction,
  Diagnostic,
  DocumentVersion,
  EditRefusal,
  Range,
} from "../../types";
import type { ReferenceIndex } from "../references/referenceIndex";

interface CodeActionContext {
  text: string;
  index: ReferenceIndex;
  currentDiagnostics: Diagnostic[];
  version: DocumentVersion;
  gedcomVersion: string | undefined;
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

  const candidates = Array.from(context.index.entries())
    .filter(({ declarations }) => declarations.length === 1)
    .map(({ declarations }) => declarations[0])
    .filter((declaration) => declaration.recordTag === recordTag);
  const actions: CodeAction[] = [];

  if (candidates.length === 1) {
    const candidate = candidates[0];
    actions.push({
      title: `Replace ${xref} with ${candidate.id}`,
      kind: "quickfix",
      diagnostics: [diagnostic],
      edit: replacementEdit(context.version, diagnostic.range, candidate.id),
    });
  } else if (candidates.length > 1) {
    actions.push({
      title: `Replace ${xref} with an existing ${recordTag} record`,
      kind: "quickfix",
      diagnostics: [diagnostic],
      choices: candidates.map((candidate) => ({
        title: `Replace with ${candidate.id}`,
        edit: replacementEdit(
          context.version,
          diagnostic.range,
          candidate.id,
        ),
      })),
    });
  }

  const trailerLine = context.text
    .split(/\r?\n/u)
    .findIndex((line) => /^0\s+TRLR(?:\s|$)/u.test(line));
  if (
    trailerLine >= 0 &&
    !context.index.get(xref)?.declarations.length &&
    canCreateBareRecord(context.gedcomVersion, recordTag)
  ) {
    const newline = context.text.includes("\r\n") ? "\r\n" : "\n";
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

  return actions;
}

function canCreateBareRecord(
  gedcomVersion: string | undefined,
  recordTag: string,
): boolean {
  const isGedcom551 = gedcomVersion?.startsWith("5") === true;
  const allowed = isGedcom551
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
  const lines = text.split(/\r?\n/u);
  const line = lines[diagnostic.range.start.line];
  if (line === undefined) {
    return false;
  }
  lines[diagnostic.range.start.line] =
    line.slice(0, diagnostic.range.start.character) +
    String(expectedLevel) +
    line.slice(diagnostic.range.end.character);

  return !new GedcomDocument()
    .createDocument(lines.join("\n"))
    .getErrors()
    .some((error) => error.range.start.line === diagnostic.range.start.line);
}

function comparePosition(
  left: { line: number; character: number },
  right: { line: number; character: number },
): number {
  return left.line - right.line || left.character - right.character;
}
