import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ParsedGrammar } from "./parse-gedstruct.js";
import { parseTsv, type TsvRow } from "./parse-tsv.js";

const G7_PREFIX = "https://gedcom.io/terms/v7/";

interface PayloadEntry {
  type: string | null;
  to?: string;
  set?: string;
}

interface SubstructureEntry {
  cardinality: string;
  type: string;
}

function parsePayloadValue(raw: string): PayloadEntry {
  if (raw === "") return { type: null };
  if (raw === "Y|<NULL>") return { type: "Y|<NULL>" };

  const pointerMatch = raw.match(/^@<(.+)>@$/);
  if (pointerMatch) {
    return { type: "pointer", to: pointerMatch[1] };
  }

  return { type: raw };
}

function buildPayloads(
  payloadsTsv: string,
  enumerationsTsv: string,
  existingPayload: Record<string, PayloadEntry>
): Record<string, PayloadEntry> {
  const payloads = parseTsv(payloadsTsv);
  const enumerations = parseTsv(enumerationsTsv);

  const enumMap = new Map<string, string>();
  for (const row of enumerations) {
    enumMap.set(row.structure, row.set);
  }

  const result: Record<string, PayloadEntry> = {};
  for (const row of payloads) {
    const entry = parsePayloadValue(row.payload);
    const enumSet = enumMap.get(row.structure);
    if (enumSet) {
      entry.set = enumSet;
    }
    result[row.structure] = entry;
  }

  for (const [type, entry] of Object.entries(existingPayload)) {
    if (!result[type]) {
      result[type] = entry;
    }
  }

  return result;
}

function buildSubstructures(
  cardinalitiesTsv: string,
  substructuresTsv: string,
  grammar: ParsedGrammar,
  existingSubstructure: Record<string, Record<string, SubstructureEntry>>
): Record<string, Record<string, SubstructureEntry>> {
  const cardinalities = parseTsv(cardinalitiesTsv);
  const substructures = parseTsv(substructuresTsv);

  const cardMap = new Map<string, string>();
  for (const row of cardinalities) {
    cardMap.set(`${row.superstructure}\t${row.structure}`, row.cardinality);
  }

  const subMap = new Map<string, Map<string, string>>();
  for (const row of substructures) {
    const parent = row.superstructure || "";
    if (!subMap.has(parent)) subMap.set(parent, new Map());
    subMap.get(parent)!.set(row.tag, row.structure);
  }

  const result: Record<string, Record<string, SubstructureEntry>> = {};

  for (const [parent, tagToType] of subMap) {
    const entries: Record<string, SubstructureEntry> = {};
    for (const [tag, typeUri] of tagToType) {
      const key = `${parent}\t${typeUri}`;
      const cardinality = cardMap.get(key);
      if (cardinality) {
        entries[tag] = { cardinality, type: typeUri };
      }
    }
    if (Object.keys(entries).length > 0) {
      result[parent] = entries;
    }
  }

  for (const [parent, entries] of Object.entries(existingSubstructure)) {
    if (!result[parent]) result[parent] = {};
    for (const [tag, entry] of Object.entries(entries)) {
      if (!result[parent][tag]) {
        result[parent][tag] = entry;
      }
    }
  }

  addGrammarRootEntries(result, grammar);

  return result;
}

function addGrammarRootEntries(
  result: Record<string, Record<string, SubstructureEntry>>,
  grammar: ParsedGrammar
) {
  const datasetEntries = grammar.structures.get("Dataset");
  if (!datasetEntries) return;

  if (!result[""]) result[""] = {};

  for (const entry of datasetEntries) {
    if (entry.ref) {
      const refEntries = grammar.structures.get(entry.ref);
      if (refEntries) {
        for (const refEntry of refEntries) {
          if (refEntry.type && !refEntry.ref) {
            if (!result[""][refEntry.tag]) {
              result[""][refEntry.tag] = {
                cardinality: entry.cardinality,
                type: refEntry.type,
              };
            }
          }
        }
      }
    } else if (entry.type) {
      if (!result[""][entry.tag]) {
        result[""][entry.tag] = {
          cardinality: entry.cardinality,
          type: entry.type,
        };
      }
    }
  }
}

function buildTagMap(
  grammar: ParsedGrammar,
  existingPayload: Record<string, PayloadEntry>,
  existingSet: Record<string, Record<string, string>>,
  existingCalendar: Record<string, { months: Record<string, string>; type: string }>,
  existingTag: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [type, tag] of grammar.tagMap) {
    result[type] = tag;
  }

  for (const [_calName, cal] of Object.entries(existingCalendar)) {
    result[cal.type] = _calName;
    for (const [monthTag, monthType] of Object.entries(cal.months)) {
      result[monthType] = monthTag;
    }
  }

  for (const [_setName, setValues] of Object.entries(existingSet)) {
    for (const [shortVal, enumType] of Object.entries(setValues)) {
      result[enumType] = shortVal;
    }
  }

  for (const [type, tag] of Object.entries(existingTag)) {
    if (!result[type]) {
      result[type] = tag;
    }
  }

  return result;
}

export function assembleSchema(
  grammar: ParsedGrammar,
  upstream: {
    cardinalities: string;
    substructures: string;
    payloads: string;
    enumerations: string;
  },
  existing: {
    calendar: Record<string, unknown>;
    label: Record<string, unknown>;
    payload: Record<string, unknown>;
    set: Record<string, unknown>;
    substructure: Record<string, unknown>;
    tag: Record<string, string>;
    tagInContext: Record<string, unknown>;
  }
) {
  const payload = buildPayloads(
    upstream.payloads,
    upstream.enumerations,
    existing.payload as Record<string, PayloadEntry>
  );
  const substructure = buildSubstructures(
    upstream.cardinalities,
    upstream.substructures,
    grammar,
    existing.substructure as Record<string, Record<string, SubstructureEntry>>
  );
  const tag = buildTagMap(
    grammar,
    payload,
    existing.set as Record<string, Record<string, string>>,
    existing.calendar as Record<string, { months: Record<string, string>; type: string }>,
    existing.tag as Record<string, string>
  );

  return {
    calendar: existing.calendar,
    label: existing.label,
    payload,
    set: existing.set,
    substructure,
    tag,
    tagInContext: existing.tagInContext,
  };
}
