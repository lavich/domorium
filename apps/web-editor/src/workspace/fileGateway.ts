/**
 * Everything the editor needs from a file system, and nothing about which one: a
 * browser without the File System Access API is another implementation rather
 * than a branch through the components, and jsdom, which has none of it, can be
 * given a tree in memory.
 */
export interface FileGateway {
  readonly name: string;
  readonly writable: boolean;
  /**
   * Whether the workspace holds more than the file that was opened: where it does
   * not, a path beside the document reaches nothing however well it resolves.
   */
  readonly folder: boolean;
  list(path: string): Promise<DirectoryEntry[]>;
  readText(path: string): Promise<string>;
  readBytes(path: string): Promise<Blob>;
  writeText(path: string, text: string): Promise<void>;
  create(path: string, text: string): Promise<void>;
}

export interface DirectoryEntry {
  /** Path from the root of the workspace, `/` separated, never leading `/`. */
  path: string;
  name: string;
  kind: "file" | "directory";
}

export class OutsideWorkspaceError extends Error {
  constructor(readonly path: string) {
    super(`${path} lies outside the folder you granted`);
    this.name = "OutsideWorkspaceError";
  }
}

export class NoSuchFileError extends Error {
  constructor(readonly path: string) {
    super(`${path} is not in this folder`);
    this.name = "NoSuchFileError";
  }
}

export class NotWritableError extends Error {
  constructor(message = "This workspace is open for reading only") {
    super(message);
    this.name = "NotWritableError";
  }
}

/**
 * Resolves a path against a directory inside the workspace, refusing anything that
 * climbs out of it or names the file system's own root. Every gateway resolves
 * through this.
 */
export function resolveInWorkspace(
  baseDirectory: string,
  path: string,
): string {
  if (path.startsWith("/") || /^[A-Za-z]:[\\/]/.test(path)) {
    throw new OutsideWorkspaceError(path);
  }
  const segments = baseDirectory ? baseDirectory.split("/") : [];
  for (const segment of path.replace(/\\/g, "/").split("/")) {
    if (segment === "" || segment === ".") {
      continue;
    }
    if (segment === "..") {
      if (segments.length === 0) {
        throw new OutsideWorkspaceError(path);
      }
      segments.pop();
      continue;
    }
    segments.push(segment);
  }
  return segments.join("/");
}

/** The directory a path sits in, as `resolveInWorkspace` expects to receive it. */
export function directoryOf(path: string): string {
  const cut = path.lastIndexOf("/");
  return cut < 0 ? "" : path.slice(0, cut);
}
