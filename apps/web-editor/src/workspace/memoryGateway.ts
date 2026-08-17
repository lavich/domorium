import {
  directoryOf,
  NoSuchFileError,
  NotWritableError,
  resolveInWorkspace,
  type DirectoryEntry,
  type FileGateway,
} from "./fileGateway";

/**
 * A workspace held in a map, for tests and for the demo. It is the only
 * implementation the test suite can drive: jsdom has no File System Access API,
 * so a test against the real one would be a test against a stub of our own
 * making either way — better an honest tree than a pretend handle.
 */
export function createMemoryGateway(
  files: Record<string, string | Blob>,
  options: { name?: string; writable?: boolean; folder?: boolean } = {},
): FileGateway {
  const tree = new Map<string, string | Blob>(Object.entries(files));
  const writable = options.writable ?? true;

  const read = (path: string) => {
    const found = tree.get(path);
    if (found === undefined) {
      throw new NoSuchFileError(path);
    }
    return found;
  };

  return {
    name: options.name ?? "memory",
    writable,
    folder: options.folder ?? true,

    // Every method is async so a refusal arrives as a rejection: these throw
    // for a path outside the workspace, and a caller holding a promise should
    // not have to catch an exception as well.
    async list(path) {
      return entriesUnder(tree, resolveInWorkspace("", path));
    },

    async readText(path) {
      const found = read(resolveInWorkspace("", path));
      return typeof found === "string" ? found : found.text();
    },

    async readBytes(path) {
      const found = read(resolveInWorkspace("", path));
      return typeof found === "string" ? new Blob([found]) : found;
    },

    async writeText(path, text) {
      if (!writable) {
        throw new NotWritableError();
      }
      const resolved = resolveInWorkspace("", path);
      read(resolved);
      tree.set(resolved, text);
    },

    async create(path, text) {
      if (!writable) {
        throw new NotWritableError();
      }
      tree.set(resolveInWorkspace("", path), text);
    },
  };
}

/** Immediate children of a directory, directories before files, each once. */
function entriesUnder(
  tree: Map<string, string | Blob>,
  directory: string,
): DirectoryEntry[] {
  const prefix = directory ? `${directory}/` : "";
  const seen = new Map<string, DirectoryEntry>();

  for (const path of tree.keys()) {
    if (!path.startsWith(prefix)) {
      continue;
    }
    const rest = path.slice(prefix.length);
    const cut = rest.indexOf("/");
    const name = cut < 0 ? rest : rest.slice(0, cut);
    if (!name || name.startsWith(".")) {
      continue;
    }
    seen.set(name, {
      path: `${prefix}${name}`,
      name,
      kind: cut < 0 ? "file" : "directory",
    });
  }

  return [...seen.values()].sort(
    (one, other) =>
      Number(one.kind === "file") - Number(other.kind === "file") ||
      one.name.localeCompare(other.name),
  );
}

export { directoryOf };
