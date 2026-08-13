import { ASTNode } from "../parser";
import { GedcomScheme } from "../schemes/schema-types";
import g7validationJson from "../schemes/g7validation.json";
import g551validationJson from "../schemes/g551validation.json";
import type { Range } from "../types/position";
import { getGedcomVersion } from "./getGedcomVersion";

export type GedcomDialect = "7.0" | "5.5.1";

interface SchemaChoice {
  scheme: GedcomScheme;
  dialect: GedcomDialect;
  /** GEDCOM 7 onwards requires every extension tag to be declared in SCHMA. */
  requiresSchmaDeclaration: boolean;
}

export type VersionResolution =
  | ({ kind: "supported"; version: string; range: Range } & SchemaChoice)
  | ({
      kind: "substituted";
      version: string;
      range: Range;
    } & SchemaChoice)
  | { kind: "unsupported"; version: string; range: Range }
  /** The payload of HEAD.SYST, which is the program that wrote the file. */
  | { kind: "paf"; system: string; range: Range }
  | ({ kind: "undetermined"; range: Range } & SchemaChoice);

type Entry =
  | ({ kind: "supported"; version: string } & SchemaChoice)
  | ({ kind: "substituted"; version: string } & SchemaChoice);

// Which dialect may borrow another's schema is decided by the direction of the
// difference between them; ADR-0009 records the measurement per entry. 5.5.5 and
// 5.5 EL are listed because they begin with 5.5 — leaving them out would resolve
// them as 5.5 rather than leave them unsupported.
//
// The order carries meaning of its own: newest first, because the first
// supported entry is what a versionless document completes against. Matching
// does not use it — see BY_LENGTH below.
const TABLE: readonly Entry[] = [
  {
    kind: "supported",
    version: "7.0",
    dialect: "7.0",
    scheme: g7validationJson,
    requiresSchmaDeclaration: true,
  },
  {
    kind: "supported",
    version: "5.5.1",
    dialect: "5.5.1",
    scheme: g551validationJson,
    requiresSchmaDeclaration: false,
  },
  {
    kind: "substituted",
    version: "5.5.5",
    dialect: "5.5.1",
    scheme: g551validationJson,
    requiresSchmaDeclaration: false,
  },
  {
    kind: "substituted",
    version: "5.5 EL",
    dialect: "5.5.1",
    scheme: g551validationJson,
    requiresSchmaDeclaration: false,
  },
  {
    kind: "substituted",
    version: "5.5",
    dialect: "5.5.1",
    scheme: g551validationJson,
    requiresSchmaDeclaration: false,
  },
];

const BY_LENGTH = [...TABLE].sort(
  (a, b) => b.version.length - a.version.length,
);

const NEWEST_SUPPORTED = TABLE.find(({ kind }) => kind === "supported")!;

const ORIGIN: Range = {
  start: { line: 0, character: 0 },
  end: { line: 0, character: 0 },
};

/** The schema a caller names outright, for text that carries no header. */
export function schemaForDialect(dialect: GedcomDialect): SchemaChoice {
  const entry = TABLE.find(
    (candidate) =>
      candidate.kind === "supported" && candidate.dialect === dialect,
  )!;
  return {
    scheme: entry.scheme,
    dialect: entry.dialect,
    requiresSchmaDeclaration: entry.requiresSchmaDeclaration,
  };
}

/**
 * Step 1 of FamilySearch's version-detection algorithm reads until whichever of
 * `1 GEDC` and `1 SYST` comes first. `1 SYST` skips the version entirely and
 * sends the file to the Personal Ancestral File specification, so it does not
 * weigh against `2 VERS` — it replaces it.
 */
function readSystem(HEAD: ASTNode | undefined): ASTNode | undefined {
  const at = (tag: string) =>
    HEAD?.children.findIndex((node) => node.tokens.TAG?.value === tag) ?? -1;
  const syst = at("SYST");
  if (syst === -1) {
    return undefined;
  }
  const gedc = at("GEDC");
  return gedc === -1 || syst < gedc ? HEAD?.children[syst] : undefined;
}

export function resolveGedcomVersion(nodes: ASTNode[]): VersionResolution {
  const HEAD = nodes.find((node) => node.tokens.TAG?.value === "HEAD");
  const GEDC = HEAD?.children.find((node) => node.tokens.TAG?.value === "GEDC");
  const VERS = GEDC?.children.find((node) => node.tokens.TAG?.value === "VERS");
  const range = VERS?.tokens.VALUE?.range ?? HEAD?.range ?? ORIGIN;

  const SYST = readSystem(HEAD);
  if (SYST) {
    return {
      kind: "paf",
      system: SYST.tokens.VALUE?.value?.trim() ?? "",
      range: SYST.tokens.VALUE?.range ?? SYST.range,
    };
  }

  const version = getGedcomVersion(nodes);
  if (!version) {
    // An empty buffer has no version and is the common case in an editor, so it
    // still gets a schema to complete the header against.
    const { scheme, dialect, requiresSchmaDeclaration } = NEWEST_SUPPORTED;
    return {
      kind: "undetermined",
      scheme,
      dialect,
      requiresSchmaDeclaration,
      range,
    };
  }

  const entry = BY_LENGTH.find(({ version: match }) =>
    version.startsWith(match),
  );
  return entry ? { ...entry, range } : { kind: "unsupported", version, range };
}
