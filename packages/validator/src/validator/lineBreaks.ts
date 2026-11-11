import type { GedcomScheme, GedcomType } from "../schemes/schema-types";

const V7 = "https://gedcom.io/terms/v7/";
const V551 = "https://gedcom.io/terms/v5.5.1/";
const TEXT_7 = "http://www.w3.org/2001/XMLSchema#string";

// 5.5.1 lists, structure by structure, which values its grammar continues with
// CONT or CONC; nothing else may span lines there.
const CONTINUED_551 = new Set(
  [
    "ADDR",
    "AUTH",
    "DSCR",
    "HEAD-NOTE",
    "HEAD-SOUR-DATA-COPR",
    "NOTE-SUBMITTER_TEXT_OR_NULL",
    "NOTE-XREF_NOTE",
    "PUBL",
    "record-NOTE",
    "SOUR-SOURCE_DESCRIPTION",
    "SOUR-TITL",
    "SOUR-XREF_SOUR",
    "TEXT",
  ].map((id) => V551 + id),
);

const PROSE = new Set([
  ...["ADDR", "NOTE", "NOTE-TRAN", "record-SNOTE", "TEXT"].map((id) => V7 + id),
  ...[
    "ADDR",
    "HEAD-NOTE",
    "NOTE-SUBMITTER_TEXT_OR_NULL",
    "NOTE-XREF_NOTE",
    "record-NOTE",
    "TEXT",
  ].map((id) => V551 + id),
]);

export function lineBreaksOf(
  scheme: GedcomScheme,
  type: GedcomType,
): { lineBreaks: boolean; prose: boolean } {
  const lineBreaks = type.startsWith(V551)
    ? CONTINUED_551.has(type)
    : scheme.payload[type]?.type === TEXT_7;
  return { lineBreaks, prose: lineBreaks && PROSE.has(type) };
}
