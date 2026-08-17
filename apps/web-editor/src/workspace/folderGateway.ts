import {
  NoSuchFileError,
  NotWritableError,
  resolveInWorkspace,
  type DirectoryEntry,
  type FileGateway,
} from "./fileGateway";

/**
 * The File System Access API, and nothing else: every call the editor makes into
 * the browser is here, so the surface no test can reach stays this small.
 */
export function createFolderGateway(
  root: FileSystemDirectoryHandle,
): FileGateway {
  const directoryAt = async (path: string) => {
    let handle = root;
    for (const segment of path ? path.split("/") : []) {
      handle = await handle.getDirectoryHandle(segment);
    }
    return handle;
  };

  const fileAt = async (path: string) => {
    const cut = path.lastIndexOf("/");
    const directory = await directoryAt(cut < 0 ? "" : path.slice(0, cut));
    return directory.getFileHandle(cut < 0 ? path : path.slice(cut + 1));
  };

  const missing = async <T>(path: string, read: () => Promise<T>) => {
    try {
      return await read();
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "NotFoundError") {
        throw new NoSuchFileError(path);
      }
      throw cause;
    }
  };

  const write = async (path: string, text: string, creating: boolean) => {
    const resolved = resolveInWorkspace("", path);
    if ((await permissionToWrite(root)) !== "granted") {
      throw new NotWritableError();
    }
    const cut = resolved.lastIndexOf("/");
    const directory = await directoryAt(cut < 0 ? "" : resolved.slice(0, cut));
    const name = cut < 0 ? resolved : resolved.slice(cut + 1);
    const handle = await missing(resolved, () =>
      directory.getFileHandle(name, { create: creating }),
    );
    // The platform writes to a swap file and commits on close, which is the
    // "previous content or new content, never a mixture" the spec asks for.
    const stream = await handle.createWritable();
    try {
      await stream.write(text);
    } finally {
      await stream.close();
    }
  };

  return {
    name: root.name,
    writable: true,
    folder: true,

    async list(path) {
      const resolved = resolveInWorkspace("", path);
      const directory = await missing(resolved, () => directoryAt(resolved));
      const entries: DirectoryEntry[] = [];
      // `entries()` is part of the API and not of the DOM types this project
      // compiles against, which describe the handle without its iterators.
      const iterate = directory as FileSystemDirectoryHandle & {
        entries(): AsyncIterable<[string, { kind: string }]>;
      };
      for await (const [name, handle] of iterate.entries()) {
        if (name.startsWith(".")) {
          continue;
        }
        entries.push({
          path: resolved ? `${resolved}/${name}` : name,
          name,
          kind: handle.kind === "directory" ? "directory" : "file",
        });
      }
      return entries.sort(
        (one, other) =>
          Number(one.kind === "file") - Number(other.kind === "file") ||
          one.name.localeCompare(other.name),
      );
    },

    async readText(path) {
      const resolved = resolveInWorkspace("", path);
      const handle = await missing(resolved, () => fileAt(resolved));
      return (await handle.getFile()).text();
    },

    async readBytes(path) {
      const resolved = resolveInWorkspace("", path);
      const handle = await missing(resolved, () => fileAt(resolved));
      return handle.getFile();
    },

    writeText: (path, text) => write(path, text, false),
    create: (path, text) => write(path, text, true),
  };
}

/**
 * The picker is part of the API and not of the DOM types this project compiles
 * against, so its shape is stated once, here, beside the rest of the adapter.
 */
export function pickFolder(): Promise<FileSystemDirectoryHandle> {
  const browser = window as unknown as {
    showDirectoryPicker(options?: {
      mode?: "read" | "readwrite";
    }): Promise<FileSystemDirectoryHandle>;
  };
  return browser.showDirectoryPicker({ mode: "readwrite" });
}

/** The browser's save dialog, which also owns the warning about replacing a file. */
export function pickSaveFile(
  suggestedName: string,
): Promise<FileSystemFileHandle> {
  const browser = window as unknown as {
    showSaveFilePicker(options?: {
      suggestedName?: string;
      types?: { description: string; accept: Record<string, string[]> }[];
    }): Promise<FileSystemFileHandle>;
  };
  return browser.showSaveFilePicker({
    suggestedName,
    types: [
      {
        description: "GEDCOM file",
        accept: { "text/plain": [".ged", ".gedcom"] },
      },
    ],
  });
}

/**
 * Where a chosen file sits inside the granted folder, if it does at all. Only the
 * platform can answer: a handle carries no path.
 */
export async function pathWithin(
  root: FileSystemDirectoryHandle,
  file: FileSystemFileHandle,
): Promise<string | null> {
  const resolve = (
    root as FileSystemDirectoryHandle & {
      resolve?(descendant: FileSystemHandle): Promise<string[] | null>;
    }
  ).resolve;
  const segments = await resolve?.call(root, file);
  return segments ? segments.join("/") : null;
}

/** Writes through a handle the reader chose, which no path of ours addresses. */
export async function writeThroughHandle(
  file: FileSystemFileHandle,
  text: string,
): Promise<void> {
  const stream = await file.createWritable();
  try {
    await stream.write(text);
  } finally {
    await stream.close();
  }
}

export function savePickerAvailable(
  browser: { showSaveFilePicker?: unknown } = window as never,
): boolean {
  return typeof browser.showSaveFilePicker === "function";
}

export function folderAccessAvailable(
  browser: Pick<Window, never> & { showDirectoryPicker?: unknown } = window,
): boolean {
  return typeof browser.showDirectoryPicker === "function";
}

/**
 * Asking for write permission is a separate step from being handed the folder:
 * a reader can grant one for reading and refuse the other.
 */
async function permissionToWrite(
  root: FileSystemDirectoryHandle,
): Promise<PermissionState> {
  const handle = root as FileSystemDirectoryHandle & {
    queryPermission?(descriptor: {
      mode: "readwrite";
    }): Promise<PermissionState>;
    requestPermission?(descriptor: {
      mode: "readwrite";
    }): Promise<PermissionState>;
  };
  const queried = await handle.queryPermission?.({ mode: "readwrite" });
  if (queried === "granted" || queried === undefined) {
    return queried ?? "granted";
  }
  return (await handle.requestPermission?.({ mode: "readwrite" })) ?? "denied";
}
