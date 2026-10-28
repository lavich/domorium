import {
  resolveFileTarget,
  type DocumentLink,
  type GedcomDialect,
} from "@domorium/codemirror";

import {
  directoryOf,
  OutsideWorkspaceError,
  resolveInWorkspace,
} from "./fileGateway";

export type FollowedLink =
  | { kind: "web"; url: string }
  | { kind: "file"; path: string }
  | { kind: "refused"; message: string };

/**
 * What following a link should do. The language service resolves the payload;
 * the app adds the one thing only it knows — whether a folder is open — and
 * which notice a payload it cannot open deserves.
 */
export function followLink(
  link: Pick<DocumentLink, "kind" | "targetText">,
  document: {
    path: string;
    hasWorkspace: boolean;
    dialect: GedcomDialect | undefined;
  },
): FollowedLink {
  if (link.kind === "http") {
    return { kind: "web", url: link.targetText };
  }
  if (!document.hasWorkspace) {
    return {
      kind: "refused",
      message: `Open a folder to reach ${link.targetText}`,
    };
  }
  if (link.kind === "file-absolute") {
    return {
      kind: "refused",
      message: `${link.targetText} lies outside the folder you granted`,
    };
  }
  const path = resolveFileTarget(
    document.path,
    link.targetText,
    document.dialect,
  );
  if (path !== null) {
    return { kind: "file", path };
  }
  try {
    // Asked only to tell a payload that climbs out from one that names nothing.
    resolveInWorkspace(directoryOf(document.path), link.targetText);
  } catch (cause) {
    if (cause instanceof OutsideWorkspaceError) {
      return { kind: "refused", message: cause.message };
    }
    throw cause;
  }
  return { kind: "refused", message: `${link.targetText} cannot be reached` };
}
