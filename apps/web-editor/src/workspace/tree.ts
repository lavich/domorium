import type { DirectoryEntry, FileGateway } from "./fileGateway";
import { fileKindOf, type FileKind } from "./workspace";

export interface TreeNode extends DirectoryEntry {
  /** Depth from the root, for the indentation the explorer draws. */
  depth: number;
  kindIfFile: FileKind | null;
  expanded: boolean;
}

/**
 * The explorer's rows, flat, with the depth on each. A directory is read when it
 * is expanded and never before: a folder should cost what the reader opens, not
 * what it holds.
 */
export async function treeRows(
  gateway: FileGateway,
  expanded: ReadonlySet<string>,
): Promise<TreeNode[]> {
  const rows: TreeNode[] = [];

  const walk = async (directory: string, depth: number) => {
    for (const entry of await gateway.list(directory)) {
      const open = entry.kind === "directory" && expanded.has(entry.path);
      rows.push({
        ...entry,
        depth,
        kindIfFile: entry.kind === "file" ? fileKindOf(entry.path) : null,
        expanded: open,
      });
      if (open) {
        await walk(entry.path, depth + 1);
      }
    }
  };

  await walk("", 0);
  return rows;
}

export function toggled(
  expanded: ReadonlySet<string>,
  path: string,
): Set<string> {
  const next = new Set(expanded);
  if (!next.delete(path)) {
    next.add(path);
  }
  return next;
}
