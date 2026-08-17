import { downloadGedcom } from "../editor/fileActions";
import {
  NoSuchFileError,
  NotWritableError,
  type FileGateway,
} from "./fileGateway";

/**
 * One chosen file and nothing around it — what a browser without folder access
 * can offer. It satisfies the same interface so the workspace never asks which
 * kind it has: listing answers with that single file, and writing gives the
 * reader a copy to put back themselves, which is what the editor did before a
 * folder could be granted at all.
 */
export function createSingleFileGateway(
  fileName: string,
  text: string,
  download: (text: string, fileName: string) => void = downloadGedcom,
): FileGateway {
  let current = text;

  const only = (path: string) => {
    if (path !== fileName) {
      throw new NoSuchFileError(path);
    }
  };

  return {
    name: fileName,
    // Nothing here reaches the file the reader chose: the browser hands over a
    // snapshot, not a handle. Saving is a download, which the workspace has to
    // know about, because "saved" means something different for it.
    writable: false,

    async list(path) {
      return path === ""
        ? [{ path: fileName, name: fileName, kind: "file" as const }]
        : [];
    },

    async readText(path) {
      only(path);
      return current;
    },

    async readBytes(path) {
      only(path);
      return new Blob([current], { type: "text/plain" });
    },

    async writeText(path, next) {
      only(path);
      current = next;
      download(next, fileName);
    },

    async create() {
      throw new NotWritableError(
        "A copy is downloaded; creating a file needs a folder",
      );
    },
  };
}
