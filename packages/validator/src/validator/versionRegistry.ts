import { ASTNode } from "../parser";
import { GedcomScheme } from "../schemes/schema-types";
import g7validationJson from "../schemes/g7validation.json";
import g551validationJson from "../schemes/g551validation.json";
import type { Range } from "../types/position";
import { getGedcomVersion } from "./getGedcomVersion";

/** What the schema this version selects implies, beyond the schema itself. */
interface SchemaChoice {
  scheme: GedcomScheme;
  /** GEDCOM 7 onwards requires every extension tag to be declared in SCHMA. */
  requiresSchmaDeclaration: boolean;
}

export type VersionResolution =
  | ({ kind: "supported"; version: string; range: Range } & SchemaChoice)
  | ({
      kind: "substituted";
      version: string;
      using: string;
      range: Range;
    } & SchemaChoice)
  | { kind: "unsupported"; version: string; range: Range }
  | ({ kind: "undetermined"; range: Range } & SchemaChoice);

type Entry =
  | ({ kind: "supported"; version: string } & SchemaChoice)
  | ({ kind: "substituted"; version: string; using: string } & SchemaChoice);

// Whether one schema may stand in for another version depends on the direction
// of the difference between them; ADR-0009 records the measurement per entry.
// 5.5.5 and 5.5 EL are listed because they begin with 5.5 — leaving them out
// would resolve them as 5.5 rather than leave them unsupported.
// Written newest first: the first supported entry is what a document with no
// version yet is offered completions from, so a new release goes at the top.
const TABLE: readonly Entry[] = [
  {
    kind: "supported",
    version: "7.0",
    scheme: g7validationJson,
    requiresSchmaDeclaration: true,
  },
  {
    kind: "supported",
    version: "5.5.1",
    scheme: g551validationJson,
    requiresSchmaDeclaration: false,
  },
  {
    kind: "substituted",
    version: "5.5.5",
    using: "5.5.1",
    scheme: g551validationJson,
    requiresSchmaDeclaration: false,
  },
  {
    kind: "substituted",
    version: "5.5 EL",
    using: "5.5.1",
    scheme: g551validationJson,
    requiresSchmaDeclaration: false,
  },
  {
    kind: "substituted",
    version: "5.5",
    using: "5.5.1",
    scheme: g551validationJson,
    requiresSchmaDeclaration: false,
  },
];

// Matching is longest-first, which is independent of the order above: reordering
// the table changes which version a versionless document assumes, not what any
// version resolves to.
const BY_LENGTH = [...TABLE].sort(
  (a, b) => b.version.length - a.version.length,
);

const NEWEST_SUPPORTED = TABLE.find(({ kind }) => kind === "supported")!;

const ORIGIN: Range = {
  start: { line: 0, character: 0 },
  end: { line: 0, character: 0 },
};

export function resolveGedcomVersion(nodes: ASTNode[]): VersionResolution {
  const HEAD = nodes.find((node) => node.tokens.TAG?.value === "HEAD");
  const GEDC = HEAD?.children.find((node) => node.tokens.TAG?.value === "GEDC");
  const VERS = GEDC?.children.find((node) => node.tokens.TAG?.value === "VERS");
  const range = VERS?.tokens.VALUE?.range ?? HEAD?.range ?? ORIGIN;

  const version = getGedcomVersion(nodes);
  if (!version) {
    // An empty or half-typed document has no version and is the common case in
    // an editor, so it still gets a schema to complete against — the newest,
    // since that is what a new file is most likely becoming. An unsupported
    // version gets none: that file is not on its way to being supported.
    const { scheme, requiresSchmaDeclaration } = NEWEST_SUPPORTED;
    return {
      kind: "undetermined",
      scheme,
      requiresSchmaDeclaration,
      range,
    };
  }

  const entry = BY_LENGTH.find(({ version: match }) =>
    version.startsWith(match),
  );
  return entry ? { ...entry, range } : { kind: "unsupported", version, range };
}
