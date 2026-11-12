import type { EditRefusalCode } from "../../types";

const CODES: Record<string, EditRefusalCode> = {
  VAL001: "unknown-field",
  VAL002: "required-field-missing",
  VAL003: "value-required",
  VAL004: "payload-datatype",
  VAL005: "value-not-in-enum",
  VAL006: "payload-datatype",
  VAL007: "cardinality-exceeded",
  VAL014: "payload-datatype",
  VAL016: "payload-datatype",
  VAL017: "value-spans-lines",
  VAL018: "value-not-allowed",
  VAL019: "value-required",
  VAL020: "file-target-unsupported",
  VAL021: "value-not-in-enum",
  "unresolved-xref": "unresolved-pointer",
};

export const refusalCodeOf = (diagnosticCode: string): EditRefusalCode =>
  CODES[diagnosticCode] ?? "rule-violation";

/** An unknown tag is a warning of the validator and still a wrong choice of field. */
export const refuses = (diagnostic: {
  code: string;
  severity?: string;
  level?: string;
}): boolean =>
  (diagnostic.severity ?? diagnostic.level) === "error" ||
  diagnostic.code === "VAL001";
