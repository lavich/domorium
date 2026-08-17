import { describe, expect, it, vi } from "vitest";

import { NoSuchFileError, NotWritableError } from "./fileGateway";
import { createMemoryGateway } from "./memoryGateway";
import { createSingleFileGateway } from "./singleFileGateway";

describe("a workspace of one chosen file", () => {
  it("lists that file and nothing else", async () => {
    const gateway = createSingleFileGateway("tree.ged", "0 HEAD\n", vi.fn());

    await expect(gateway.list("")).resolves.toEqual([
      { path: "tree.ged", name: "tree.ged", kind: "file" },
    ]);
    await expect(gateway.list("media")).resolves.toEqual([]);
  });

  it("reads the file it was given", async () => {
    const gateway = createSingleFileGateway("tree.ged", "0 HEAD\n", vi.fn());

    await expect(gateway.readText("tree.ged")).resolves.toBe("0 HEAD\n");
    await expect(gateway.readText("media/portrait.jpg")).rejects.toThrow(
      NoSuchFileError,
    );
  });

  it("gives a copy back instead of writing, and says it cannot write", async () => {
    const download = vi.fn();
    const gateway = createSingleFileGateway("tree.ged", "0 HEAD\n", download);

    await gateway.writeText("tree.ged", "0 HEAD\n0 TRLR\n");

    expect(download).toHaveBeenCalledWith("0 HEAD\n0 TRLR\n", "tree.ged");
    expect(gateway.writable).toBe(false);
  });

  // Following a link out of a document needs to know this: a path beside the
  // document reaches nothing where the workspace is one file.
  it("says it holds no folder", () => {
    expect(
      createSingleFileGateway("tree.ged", "0 HEAD\n", vi.fn()).folder,
    ).toBe(false);
  });

  it("cannot create a second file", async () => {
    const gateway = createSingleFileGateway("tree.ged", "0 HEAD\n", vi.fn());

    await expect(gateway.create("other.ged", "0 HEAD\n")).rejects.toThrow(
      NotWritableError,
    );
  });
});

/** A method missing from one gateway is a bug for a test, not for a component. */
describe("both gateways answer the same interface", () => {
  it("carries the same methods and the same shape of answer", async () => {
    const single = createSingleFileGateway("tree.ged", "0 HEAD\n", vi.fn());
    const folderLike = createMemoryGateway({ "tree.ged": "0 HEAD\n" });

    for (const key of [
      "name",
      "writable",
      "folder",
      "list",
      "readText",
      "readBytes",
      "writeText",
      "create",
    ] as const) {
      expect(typeof single[key], key).toBe(typeof folderLike[key]);
    }

    for (const gateway of [single, folderLike]) {
      await expect(gateway.readText("tree.ged")).resolves.toBe("0 HEAD\n");
      await expect(gateway.list("")).resolves.toMatchObject([
        { name: "tree.ged", kind: "file" },
      ]);
      await expect(
        gateway.readBytes("tree.ged").then((blob) => blob.size),
      ).resolves.toBe(7);
    }
  });
});
