import { describe, expect, it, vi } from "vitest";

import { NoSuchFileError, NotWritableError } from "./fileGateway";
import { createFolderGateway, folderAccessAvailable } from "./folderGateway";

/**
 * A stand-in for a granted directory: jsdom implements no part of the File
 * System Access API, so this is the only way to drive the adapter at all. It
 * carries the two behaviours the adapter depends on — a `NotFoundError` for a
 * name that is not there, and a permission that can be refused.
 */
function grantedFolder(
  tree: Record<string, string>,
  options: { permission?: PermissionState; name?: string } = {},
) {
  const written = new Map<string, string>();
  const permission = options.permission ?? "granted";

  const directory = (prefix: string): FileSystemDirectoryHandle => {
    const handle = {
      kind: "directory" as const,
      name: prefix.split("/").filter(Boolean).at(-1) ?? options.name ?? "root",
      async *entries(): AsyncGenerator<[string, { kind: string }]> {
        const seen = new Set<string>();
        for (const path of Object.keys(tree)) {
          if (!path.startsWith(prefix)) {
            continue;
          }
          const rest = path.slice(prefix.length);
          const cut = rest.indexOf("/");
          const name = cut < 0 ? rest : rest.slice(0, cut);
          if (!name || seen.has(name)) {
            continue;
          }
          seen.add(name);
          yield [name, { kind: cut < 0 ? "file" : "directory" }];
        }
      },
      getDirectoryHandle(name: string) {
        const nested = `${prefix}${name}/`;
        if (!Object.keys(tree).some((path) => path.startsWith(nested))) {
          return Promise.reject(
            new DOMException(`${name} not found`, "NotFoundError"),
          );
        }
        return Promise.resolve(directory(nested));
      },
      getFileHandle(name: string, init?: { create?: boolean }) {
        const path = `${prefix}${name}`;
        if (!(path in tree) && !init?.create) {
          return Promise.reject(
            new DOMException(`${name} not found`, "NotFoundError"),
          );
        }
        return Promise.resolve({
          kind: "file" as const,
          name,
          getFile: () =>
            Promise.resolve(
              new File([tree[path] ?? ""], name, { type: "text/plain" }),
            ),
          createWritable: () =>
            Promise.resolve({
              write: (text: string) => {
                written.set(path, text);
                return Promise.resolve();
              },
              close: () => {
                tree[path] = written.get(path) ?? tree[path];
                return Promise.resolve();
              },
            }),
        });
      },
      queryPermission: () => Promise.resolve(permission),
      requestPermission: () => Promise.resolve(permission),
    };
    return handle as unknown as FileSystemDirectoryHandle;
  };

  return { root: directory(""), tree, written };
}

describe("whether a browser can grant a folder", () => {
  it("is decided by the picker being there, not by a user agent string", () => {
    expect(folderAccessAvailable({ showDirectoryPicker: () => {} })).toBe(true);
    expect(folderAccessAvailable({})).toBe(false);
  });
});

describe("a workspace backed by a granted folder", () => {
  const folder = () =>
    grantedFolder({
      "tree.ged": "0 HEAD\n0 TRLR\n",
      "notes.md": "# Note\n",
      "media/portrait.jpg": "bytes",
      ".hidden": "x",
    });

  it("lists a directory, hiding dot names and putting directories first", async () => {
    const { root } = folder();

    await expect(createFolderGateway(root).list("")).resolves.toEqual([
      { path: "media", name: "media", kind: "directory" },
      { path: "notes.md", name: "notes.md", kind: "file" },
      { path: "tree.ged", name: "tree.ged", kind: "file" },
    ]);
  });

  it("reads a nested file as text and as bytes", async () => {
    const gateway = createFolderGateway(folder().root);

    await expect(gateway.readText("tree.ged")).resolves.toBe(
      "0 HEAD\n0 TRLR\n",
    );
    await expect(
      gateway.readBytes("media/portrait.jpg").then((blob) => blob.size),
    ).resolves.toBe(5);
  });

  it("turns the platform's NotFoundError into one that names the path", async () => {
    await expect(
      createFolderGateway(folder().root).readText("media/missing.jpg"),
    ).rejects.toThrow(NoSuchFileError);
  });

  it("writes a file it holds and creates one it does not", async () => {
    const granted = folder();
    const gateway = createFolderGateway(granted.root);

    await gateway.writeText("tree.ged", "0 HEAD\n0 EXTRA\n");
    await gateway.create("tree-cleaned.ged", "0 HEAD\n");

    expect(granted.tree["tree.ged"]).toBe("0 HEAD\n0 EXTRA\n");
    expect(granted.tree["tree-cleaned.ged"]).toBe("0 HEAD\n");
  });

  // The reader can be handed a folder to read and refuse to let it be written.
  it("refuses to write when permission is denied, leaving the file alone", async () => {
    const granted = grantedFolder(
      { "tree.ged": "0 HEAD\n" },
      { permission: "denied" },
    );

    await expect(
      createFolderGateway(granted.root).writeText("tree.ged", "0 TRLR\n"),
    ).rejects.toThrow(NotWritableError);
    expect(granted.tree["tree.ged"]).toBe("0 HEAD\n");
  });

  it("refuses a path that climbs out before it touches the folder", async () => {
    const granted = folder();
    const spy = vi.spyOn(granted.root, "getDirectoryHandle");

    await expect(
      createFolderGateway(granted.root).readText("../../keys/id_rsa"),
    ).rejects.toThrow("lies outside the folder you granted");
    expect(spy).not.toHaveBeenCalled();
  });
});
