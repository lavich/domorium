/**
 * Everything the editor needs from a file system, and nothing about which one.
 *
 * A granted folder and a single chosen file are two implementations of this,
 * which is what keeps the unsupported-browser path a case rather than a branch
 * through the components — and what lets the tests run against a tree in memory,
 * since jsdom implements no part of the File System Access API.
 */
export interface FileGateway {
  /** What the workspace is called, for the explorer's header. */
  readonly name: string;
  /** Whether this gateway can write at all; a single chosen file cannot. */
  readonly writable: boolean;
  /**
   * Whether the workspace holds more than the file that was opened. A single
   * chosen file and the demo do not, so a path beside the document reaches
   * nothing there however well it resolves.
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

/** A path that leaves the workspace, or names it absolutely, reaches nothing. */
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
 * Resolves a path against a directory inside the workspace, refusing anything
 * that climbs out of it or names the file system's own root. Every gateway
 * resolves through this: the root is the only thing an app knows and a package
 * cannot.
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
