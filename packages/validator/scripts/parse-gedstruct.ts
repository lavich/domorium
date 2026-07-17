const G7_PREFIX = "https://gedcom.io/terms/v7/";

export interface GrammarStructure {
  tag: string;
  cardinality: string;
  type: string | null;
  level: number;
  ref: string | null;
}

export interface ParsedGrammar {
  tagMap: Map<string, string>;
  structures: Map<string, GrammarStructure[]>;
}

export function parseGedstruct(text: string): ParsedGrammar {
  const tagMap = new Map<string, string>();
  const structures = new Map<string, GrammarStructure[]>();

  let currentStructure: string | null = null;

  for (const line of text.split("\n")) {
    const trimmed = line.trimEnd();
    if (trimmed.length === 0) continue;

    const structMatch = trimmed.match(/^(\w+)\s*:=/);
    if (structMatch) {
      currentStructure = structMatch[1];
      if (!structures.has(currentStructure)) {
        structures.set(currentStructure, []);
      }
      continue;
    }

    if (trimmed === "[" || trimmed === "]" || trimmed === "|") continue;

    if (currentStructure === null) continue;

    const entry = parseLine(trimmed);
    if (entry) {
      const list = structures.get(currentStructure)!;
      list.push(entry);

      if (entry.type) {
        tagMap.set(entry.type, entry.tag);
      }
    }
  }

  resolveReferences(structures);

  for (const entries of structures.values()) {
    for (const entry of entries) {
      if (entry.type) {
        tagMap.set(entry.type, entry.tag);
      }
    }
  }

  return { tagMap, structures };
}

function resolveReferences(structures: Map<string, GrammarStructure[]>) {
  let changed = true;
  while (changed) {
    changed = false;
    for (const [name, entries] of structures) {
      const resolved: GrammarStructure[] = [];
      for (const entry of entries) {
        if (entry.ref && structures.has(entry.ref)) {
          const refEntries = structures.get(entry.ref)!;
          const firstLine = refEntries.find((e) => e.type && !e.ref);
          if (firstLine) {
            resolved.push({
              ...entry,
              tag: firstLine.tag,
              type: firstLine.type,
              ref: null,
            });
            changed = true;
          } else {
            resolved.push(entry);
          }
        } else {
          resolved.push(entry);
        }
      }
      structures.set(name, resolved);
    }
  }
}

function parseLine(line: string): GrammarStructure | null {
  const match = line.match(
    /^\s*(?:n|(\d+)|\+(\d+))\s+(?:@[^@]+@\s+)?(\S+)(?:\s+<[^>]*>)?\s+\{(\d+):(\d+|M)\}(?:\s+g7:(\S+))?$/
  );
  if (!match) return null;

  const level =
    match[1] !== undefined
      ? parseInt(match[1], 10)
      : match[2] !== undefined
        ? parseInt(match[2], 10)
        : 0;
  const tag = match[3];
  const min = match[4];
  const max = match[5] === "M" ? "M" : match[5];
  const cardinality = `{${min}:${max}}`;

  const refMatch = tag.match(/^<<(.+)>>$/);
  const ref = refMatch ? refMatch[1] : null;

  const typeUri = match[6] ? `${G7_PREFIX}${match[6]}` : null;

  return { tag, cardinality, type: typeUri, level, ref };
}
