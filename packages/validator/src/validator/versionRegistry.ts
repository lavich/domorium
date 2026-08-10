import { ASTNode } from "../parser";
import { GedcomScheme } from "../schemes/schema-types";
import g7validationJson from "../schemes/g7validation.json";
import g551validationJson from "../schemes/g551validation.json";
import type { Range } from "../types/position";
import { getGedcomVersion } from "./getGedcomVersion";

export type VersionResolution =
  | { kind: "supported"; version: string; scheme: GedcomScheme; range: Range }
  | {
      kind: "substituted";
      version: string;
      using: string;
      scheme: GedcomScheme;
      range: Range;
    }
  | { kind: "unsupported"; version: string; range: Range }
  | { kind: "undetermined"; range: Range };

type Entry =
  | { kind: "supported"; version: string; scheme: GedcomScheme }
  | {
      kind: "substituted";
      version: string;
      using: string;
      scheme: GedcomScheme;
    };

// Whether one schema may stand in for another version depends on the direction
// of the difference between them; ADR-0009 records the measurement per entry.
// 5.5.5 and 5.5 EL are listed because they begin with 5.5 — leaving them out
// would resolve them as 5.5 rather than leave them unsupported.
const TABLE: readonly Entry[] = [
  { kind: "supported", version: "7.0", scheme: g7validationJson },
  { kind: "supported", version: "5.5.1", scheme: g551validationJson },
  {
    kind: "substituted",
    version: "5.5.5",
    using: "5.5.1",
    scheme: g551validationJson,
  },
  {
    kind: "substituted",
    version: "5.5 EL",
    using: "5.5.1",
    scheme: g551validationJson,
  },
  {
    kind: "substituted",
    version: "5.5",
    using: "5.5.1",
    scheme: g551validationJson,
  },
];

// Longest first, so the match is the longest one rather than the first written.
const BY_LENGTH = [...TABLE].sort(
  (a, b) => b.version.length - a.version.length,
);

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
    return { kind: "undetermined", range };
  }

  const entry = BY_LENGTH.find(({ version: match }) =>
    version.startsWith(match),
  );
  return entry ? { ...entry, range } : { kind: "unsupported", version, range };
}
