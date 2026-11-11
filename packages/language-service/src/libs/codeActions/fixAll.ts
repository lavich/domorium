import type {
  CodeAction,
  Diagnostic,
  DocumentVersion,
  EditRefusal,
  TextEdit,
} from "../../types";
import { applyEdits } from "../position/applyEdits";
import { headerEdit, trailerEdit } from "./headerTrailer";

interface FixAllContext {
  text: string;
  version: DocumentVersion;
  diagnostics: Diagnostic[];
  revalidate: (text: string) => Pick<Diagnostic, "code" | "data">[];
}

export function isFixAllable(diagnostic: Diagnostic): boolean {
  return (
    diagnostic.data?.missingTag === "TRLR" ||
    diagnostic.data?.missingHeader === true ||
    (diagnostic.code === "invalid-level" &&
      diagnostic.data?.expectedLevel !== undefined)
  );
}

export function getFixAll(
  context: FixAllContext,
  expectedVersion: DocumentVersion,
): CodeAction[] | EditRefusal {
  if (expectedVersion !== context.version) {
    return {
      ok: false,
      code: "stale-document",
      message: "The document changed before the fix could be applied.",
    };
  }

  const fixable = context.diagnostics.filter(isFixAllable);
  const withoutLevels = fixable.filter((diagnostic) => !isLevel(diagnostic));
  const attempt =
    tryFixes(context, fixable) ??
    (withoutLevels.length < fixable.length
      ? tryFixes(context, withoutLevels)
      : undefined);
  if (!attempt) {
    return [];
  }
  return [
    {
      title: "Fix all safe problems",
      kind: "source.fixAll",
      diagnostics: [],
      edit: { version: context.version, edits: attempt },
    },
  ];
}

function tryFixes(
  context: FixAllContext,
  fixable: Diagnostic[],
): TextEdit[] | undefined {
  const edits = editsFor(context, fixable);
  if (edits.length === 0) {
    return undefined;
  }
  const after = context.revalidate(applyEdits(context.text, edits));
  const levelFixes = fixable.filter(isLevel).length;
  const levelsHold =
    countLevels(after) === countLevels(context.diagnostics) - levelFixes;
  if (!levelsHold) {
    return undefined;
  }
  const revealsTrailer = after.some(isMissingTrailer);
  const hasTrailer = fixable.some(isMissingTrailer);
  return revealsTrailer && !hasTrailer
    ? [...edits, trailerEdit(context.text)]
    : edits;
}

function editsFor(context: FixAllContext, fixable: Diagnostic[]): TextEdit[] {
  const header = fixable.some((diagnostic) => diagnostic.data?.missingHeader);
  const trailer = fixable.some(isMissingTrailer);
  return [
    ...(header ? [headerEdit(context.text)] : []),
    ...fixable.filter(isLevel).map((diagnostic) => ({
      range: diagnostic.range,
      newText: String(diagnostic.data?.expectedLevel),
    })),
    ...(trailer ? [trailerEdit(context.text)] : []),
  ];
}

const isLevel = (diagnostic: { code: string }) =>
  diagnostic.code === "invalid-level";

const isMissingTrailer = (diagnostic: { data?: { missingTag?: string } }) =>
  diagnostic.data?.missingTag === "TRLR";

const countLevels = (diagnostics: { code: string }[]) =>
  diagnostics.filter(isLevel).length;
