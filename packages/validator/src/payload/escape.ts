import type { PayloadKind } from "../types/structure";
import type { GedcomDialect } from "../validator/versionRegistry";

const XREF = /^@[A-Za-z0-9_]+@$/;

export function escapePayload(
  value: string,
  dialect: GedcomDialect,
  kind: PayloadKind["kind"],
): string {
  if (kind !== "text") {
    return value;
  }
  return dialect === "5.5.1"
    ? value.replaceAll("@", "@@")
    : value.replace(/^@/gm, "@@");
}

export function unescapePayload(
  value: string,
  dialect: GedcomDialect,
  kind: PayloadKind["kind"],
): string {
  if (kind !== "text" && kind !== "text-or-pointer") {
    return value;
  }
  if (kind === "text-or-pointer" && XREF.test(value)) {
    return value;
  }
  return dialect === "5.5.1"
    ? value.replaceAll("@@", "@")
    : value.replace(/^@@/gm, "@");
}
