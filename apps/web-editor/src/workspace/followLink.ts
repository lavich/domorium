import type { DocumentLinkKind } from "@domorium/language-service";

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
 * What following a link should do. The language service decided what the payload
 * is; the app adds the one thing only it knows — the folder to stay inside.
 */
export function followLink(
  link: { kind: DocumentLinkKind; targetText: string },
  document: { path: string; hasWorkspace: boolean },
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
  try {
    return {
      kind: "file",
      path: resolveInWorkspace(directoryOf(document.path), link.targetText),
    };
  } catch (cause) {
    if (cause instanceof OutsideWorkspaceError) {
      return { kind: "refused", message: cause.message };
    }
    throw cause;
  }
}
