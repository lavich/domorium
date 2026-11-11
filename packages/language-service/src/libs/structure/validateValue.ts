import { escapePayload } from "@domorium/validator";

import type {
  EditRefusal,
  Position,
  StructureValueInput,
  ValueCheckResult,
} from "../../types";
import { refusal } from "./describe";
import type { EditContext } from "./edit";
import { fieldKind, payloadOf, recordShape } from "./edit";
import { structureAt, structurePath } from "./locate";
import { refusalCodeOf } from "./refusalCodes";

export function validateValue(
  context: EditContext,
  position: Position,
  tag: string,
  value: StructureValueInput,
  replacing: boolean,
): ValueCheckResult | EditRefusal {
  const dialect = context.document.getValidatedDialect();
  if (!dialect) {
    return refusal(
      "no-dialect",
      "The document was checked against no dialect.",
    );
  }
  const found = structureAt(context.document.getNodes(), position.line);
  if (!found) {
    return refusal("not-a-structure", "There is no structure on that line.");
  }
  const parent = replacing ? found.parent : found;
  const field = replacing ? (found.tokens.TAG?.value ?? tag) : tag;
  const { raw, kind } = payloadOf(
    value,
    parent
      ? fieldKind(context.document, structurePath(parent), field)
      : (recordShape(context.document, found)?.payload.kind ?? "text"),
  );
  const problems =
    context.document.checkPayload(
      parent ?? [],
      field,
      escapePayload(raw, dialect, kind),
      replacing ? found : undefined,
    ) ?? [];
  return {
    ok: true,
    problems: problems.map((problem) => ({
      code: refusalCodeOf(problem.code),
      diagnosticCode: problem.code,
      message: problem.message,
      ...(problem.data ? { data: problem.data } : {}),
      severity: problem.level,
    })),
  };
}
