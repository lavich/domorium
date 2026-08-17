import { describe, expect, it } from "vitest";

import {
  directoryOf,
  NoSuchFileError,
  NotWritableError,
  OutsideWorkspaceError,
  resolveInWorkspace,
} from "./fileGateway";
import { createMemoryGateway } from "./memoryGateway";

describe("resolving a path inside the workspace", () => {
  it("joins a relative path to the directory that names it", () => {
    expect(resolveInWorkspace("", "tree.ged")).toBe("tree.ged");
    expect(resolveInWorkspace("media", "portrait.jpg")).toBe(
      "media/portrait.jpg",
    );
    expect(resolveInWorkspace("media/people", "../portrait.jpg")).toBe(
      "media/portrait.jpg",
    );
  });

  it("reads a Windows separator, which a GEDCOM file may carry", () => {
    expect(resolveInWorkspace("", "media\\portrait.jpg")).toBe(
      "media/portrait.jpg",
    );
  });

  // A document naming `../../keys/id_rsa` would otherwise be read and shown.
  it("refuses a path that climbs out of the workspace", () => {
    expect(() => resolveInWorkspace("media", "../../keys/id_rsa")).toThrow(
      OutsideWorkspaceError,
    );
    expect(() => resolveInWorkspace("", "/etc/passwd")).toThrow(
      OutsideWorkspaceError,
    );
    expect(() => resolveInWorkspace("", "C:\\Windows\\system.ini")).toThrow(
      OutsideWorkspaceError,
    );
  });

  it("names the directory a file sits in", () => {
    expect(directoryOf("media/portrait.jpg")).toBe("media");
    expect(directoryOf("tree.ged")).toBe("");
  });
});

describe("a workspace held in memory", () => {
  const gateway = () =>
    createMemoryGateway(
      {
        "tree.ged": "0 HEAD\n0 TRLR\n",
        "notes.md": "# Note\n",
        "media/portrait.jpg": new Blob([new Uint8Array([1, 2, 3])]),
        "media/people/anna.jpg": new Blob([new Uint8Array([4])]),
        ".hidden": "x",
      },
      { name: "Webb Family" },
    );

  it("lists a directory's own entries, directories first", async () => {
    await expect(gateway().list("")).resolves.toEqual([
      { path: "media", name: "media", kind: "directory" },
      { path: "notes.md", name: "notes.md", kind: "file" },
      { path: "tree.ged", name: "tree.ged", kind: "file" },
    ]);
  });

  it("expands a directory without walking the whole tree", async () => {
    await expect(gateway().list("media")).resolves.toEqual([
      { path: "media/people", name: "people", kind: "directory" },
      { path: "media/portrait.jpg", name: "portrait.jpg", kind: "file" },
    ]);
  });

  it("omits an entry the operating system hides", async () => {
    const entries = await gateway().list("");
    expect(entries.map((entry) => entry.name)).not.toContain(".hidden");
  });

  it("reads a file as text and as bytes", async () => {
    const workspace = gateway();
    await expect(workspace.readText("tree.ged")).resolves.toBe(
      "0 HEAD\n0 TRLR\n",
    );
    await expect(
      workspace.readBytes("media/portrait.jpg").then((blob) => blob.size),
    ).resolves.toBe(3);
  });

  it("says which path it looked for when there is nothing there", async () => {
    await expect(gateway().readText("media/missing.jpg")).rejects.toThrow(
      NoSuchFileError,
    );
  });

  it("writes a file it already holds and creates one it does not", async () => {
    const workspace = gateway();
    await workspace.writeText("tree.ged", "0 HEAD\n0 TRLR\n0 EXTRA\n");
    await workspace.create("tree-cleaned.ged", "0 HEAD\n");

    await expect(workspace.readText("tree.ged")).resolves.toContain("0 EXTRA");
    await expect(workspace.readText("tree-cleaned.ged")).resolves.toBe(
      "0 HEAD\n",
    );
  });

  it("refuses to write where the workspace is read-only", async () => {
    const readOnly = createMemoryGateway(
      { "tree.ged": "0 HEAD\n" },
      { writable: false },
    );

    await expect(
      readOnly.writeText("tree.ged", "0 HEAD\n0 TRLR\n"),
    ).rejects.toThrow(NotWritableError);
    await expect(readOnly.readText("tree.ged")).resolves.toBe("0 HEAD\n");
  });
});
