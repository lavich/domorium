import { describe, expect, it, vi } from "vitest";

import { createMemoryGateway } from "./memoryGateway";
import { toggled, treeRows } from "./tree";

const folder = () =>
  createMemoryGateway({
    "tree.ged": "0 HEAD\n",
    "notes.md": "# Note\n",
    "receipt.pdf": "%PDF",
    "media/portrait.jpg": "bytes",
    "media/people/anna.jpg": "bytes",
  });

describe("the rows the explorer draws", () => {
  it("lists the root, saying what each row is", async () => {
    const rows = await treeRows(folder(), new Set());

    expect(
      rows.map((row) => [row.name, row.kind, row.kindIfFile, row.depth]),
    ).toEqual([
      ["media", "directory", null, 0],
      ["notes.md", "file", "markdown", 0],
      ["receipt.pdf", "file", "unsupported", 0],
      ["tree.ged", "file", "gedcom", 0],
    ]);
  });

  it("shows a directory's entries once it is expanded, one level deeper", async () => {
    const rows = await treeRows(folder(), new Set(["media"]));

    expect(rows.map((row) => [row.path, row.depth])).toEqual([
      ["media", 0],
      ["media/people", 1],
      ["media/portrait.jpg", 1],
      ["notes.md", 0],
      ["receipt.pdf", 0],
      ["tree.ged", 0],
    ]);
  });

  // A folder of thousands of files should cost what the reader opens.
  it("reads only the directories that are open", async () => {
    const gateway = folder();
    const list = vi.spyOn(gateway, "list");

    await treeRows(gateway, new Set());
    expect(list).toHaveBeenCalledTimes(1);

    list.mockClear();
    await treeRows(gateway, new Set(["media", "media/people"]));
    expect(list.mock.calls.map(([path]) => path)).toEqual([
      "",
      "media",
      "media/people",
    ]);
  });

  it("opens and closes a directory, leaving the others as they were", () => {
    const open = toggled(new Set(["media"]), "media/people");
    expect([...open]).toEqual(["media", "media/people"]);

    const closed = toggled(open, "media");
    expect([...closed]).toEqual(["media/people"]);
  });
});
