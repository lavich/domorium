import type { DocumentSelector } from "vscode-languageclient";

/** No scheme: a file-only selector matches nothing in a virtual workspace. #160 */
export const GEDCOM_DOCUMENTS: DocumentSelector = [{ language: "gedcom" }];
