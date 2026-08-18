import type { DocumentSelector } from "vscode-languageclient";

/**
 * The language and no scheme: a GEDCOM file opened over any file system counts,
 * which is what "limited" virtual-workspace support in the manifest promises.
 * Local file links are the part that cannot follow, and the server withholds
 * them for a document whose URI is not a file. See #160.
 */
export const GEDCOM_DOCUMENTS: DocumentSelector = [{ language: "gedcom" }];
