export type FilePathProblem =
  "absolute" | "parent-folder" | "unescaped-character";

const ABSOLUTE = /^(?:[/\\]|[A-Za-z]:)/u;
const UNESCAPED = /[\\?#:]/u;

/**
 * Why a GEDCOM 7 local file reference, a relative URI reference with no
 * scheme, names no file beside the document, or nothing where it does.
 */
export function filePathProblem(path: string): FilePathProblem | undefined {
  if (ABSOLUTE.test(path)) {
    return "absolute";
  }
  if (path.split("/").includes("..")) {
    return "parent-folder";
  }
  return UNESCAPED.test(path) ? "unescaped-character" : undefined;
}
