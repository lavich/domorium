import type { FileGateway } from "./fileGateway";
import { NotWritableError } from "./fileGateway";
import type { OpenFile } from "./workspace";

export type SaveOutcome =
  | { kind: "written"; path: string }
  | { kind: "downloaded"; name: string }
  | { kind: "unchanged" }
  | { kind: "refused"; message: string };

/**
 * The character set a document declares, where it declares one. `File.text()`
 * decodes as UTF-8, so a file that says otherwise was mangled on the way in and
 * writing it back would put the mangling on disk.
 */
export function declaredCharacterSet(text: string): string | null {
  const line = /^[ \t]*1[ \t]+CHAR[ \t]+(\S+)/im.exec(text);
  return line ? line[1].toUpperCase() : null;
}

export function decodedFaithfully(text: string): boolean {
  const declared = declaredCharacterSet(text);
  return declared === null || declared === "UTF-8" || declared === "UTF8";
}

/**
 * Saving, as a decision made away from the components: which of the four things
 * happens, and what the reader is told when none of them writes.
 */
export async function save(
  file: OpenFile,
  text: string,
  gateway: FileGateway | null,
): Promise<SaveOutcome> {
  if (file.kind !== "gedcom") {
    return {
      kind: "refused",
      message: `${file.name} is a preview, and has nothing to save`,
    };
  }
  if (!file.modified) {
    return { kind: "unchanged" };
  }
  if (!gateway) {
    return { kind: "refused", message: "No workspace is open" };
  }
  if (!decodedFaithfully(text)) {
    return {
      kind: "refused",
      message: `${file.name} declares ${declaredCharacterSet(text)}, which this editor did not decode it with, so it will not write over it`,
    };
  }
  try {
    await gateway.writeText(file.path, text);
    // A workspace that cannot be written gives the reader a copy instead, and
    // saying "written" of a download would be a lie about where the file is.
    return gateway.writable
      ? { kind: "written", path: file.path }
      : { kind: "downloaded", name: file.name };
  } catch (cause) {
    if (cause instanceof NotWritableError) {
      return { kind: "refused", message: cause.message };
    }
    return {
      kind: "refused",
      message:
        cause instanceof Error
          ? cause.message
          : `${file.name} could not be written`,
    };
  }
}

/** Whether the reader should be offered a save at all, and of which sort. */
export function saveAvailability(
  file: OpenFile | null,
  gateway: FileGateway | null,
): { save: boolean; saveAs: boolean } {
  const gedcom = file?.kind === "gedcom";
  return {
    save: gedcom && gateway !== null,
    saveAs: gedcom && gateway?.writable === true,
  };
}

/**
 * A name for a copy that does not overwrite what is already there, which is what
 * "save as" needs before it asks the reader to confirm anything.
 */
export function saveAsName(path: string): string {
  return path.replace(/(\.(?:ged|gedcom))$/i, "-copy$1");
}
