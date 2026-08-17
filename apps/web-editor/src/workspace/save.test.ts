import { describe, expect, it, vi } from "vitest";

import { NotWritableError } from "./fileGateway";
import { createMemoryGateway } from "./memoryGateway";
import { createSingleFileGateway } from "./singleFileGateway";
import { declaredCharacterSet, save, saveAvailability } from "./save";
import type { OpenFile } from "./workspace";

const document = (over: Partial<OpenFile> = {}): OpenFile => ({
  path: "tree.ged",
  name: "tree.ged",
  kind: "gedcom",
  initialText: "0 HEAD\n0 TRLR\n",
  modified: true,
  editorKey: 0,
  ...over,
});

const folder = (files: Record<string, string> = { "tree.ged": "0 HEAD\n" }) =>
  createMemoryGateway(files, { name: "Webb Family" });

describe("saving a document", () => {
  it("writes the text the editor holds to the file it came from", async () => {
    const gateway = folder();

    await expect(
      save(document(), "0 HEAD\n0 TRLR\n0 EXTRA\n", gateway),
    ).resolves.toEqual({ kind: "written", path: "tree.ged" });
    await expect(gateway.readText("tree.ged")).resolves.toContain("0 EXTRA");
  });

  it("writes nothing for a document that was not edited", async () => {
    const gateway = folder();
    const writeText = vi.spyOn(gateway, "writeText");

    await expect(
      save(document({ modified: false }), "0 HEAD\n", gateway),
    ).resolves.toEqual({ kind: "unchanged" });
    expect(writeText).not.toHaveBeenCalled();
  });

  it("refuses a preview, which has nothing to save", async () => {
    await expect(
      save(
        document({ kind: "markdown", name: "notes.md", path: "notes.md" }),
        "# Note",
        folder(),
      ),
    ).resolves.toMatchObject({ kind: "refused" });
  });

  // The reader can be handed a folder to read and refuse to let it be written.
  it("carries a refused permission back, leaving the file alone", async () => {
    const gateway = createMemoryGateway(
      { "tree.ged": "0 HEAD\n" },
      { writable: false },
    );
    // A read-only memory workspace refuses in the same way a folder does.
    vi.spyOn(gateway, "writeText").mockRejectedValue(new NotWritableError());

    await expect(save(document(), "0 TRLR\n", gateway)).resolves.toMatchObject({
      kind: "refused",
    });
    await expect(gateway.readText("tree.ged")).resolves.toBe("0 HEAD\n");
  });

  it("reports a write that fails for any other reason", async () => {
    const gateway = folder();
    vi.spyOn(gateway, "writeText").mockRejectedValue(
      new Error("The disk is full"),
    );

    await expect(save(document(), "0 TRLR\n", gateway)).resolves.toEqual({
      kind: "refused",
      message: "The disk is full",
    });
  });

  // Where no folder was granted the editor gives the file back instead.
  it("downloads a copy where the workspace cannot be written", async () => {
    const download = vi.fn();
    const gateway = createSingleFileGateway("tree.ged", "0 HEAD\n", download);

    await expect(
      save(document(), "0 HEAD\n0 TRLR\n", gateway),
    ).resolves.toEqual({ kind: "downloaded", name: "tree.ged" });
    expect(download).toHaveBeenCalledWith("0 HEAD\n0 TRLR\n", "tree.ged");
  });
});

describe("a document the editor did not decode faithfully", () => {
  const ansel = "0 HEAD\n1 CHAR ANSEL\n0 TRLR\n";

  it("names the character set it declares", () => {
    expect(declaredCharacterSet(ansel)).toBe("ANSEL");
    expect(declaredCharacterSet("0 HEAD\n1 CHAR UTF-8\n")).toBe("UTF-8");
    expect(declaredCharacterSet("0 HEAD\n0 TRLR\n")).toBeNull();
  });

  // Writing back a mangled decode is silent corruption of an irreplaceable file.
  it("is not written back", async () => {
    const gateway = folder({ "tree.ged": ansel });

    const outcome = await save(document(), ansel, gateway);

    expect(outcome).toMatchObject({ kind: "refused" });
    expect(outcome).toMatchObject({
      message: expect.stringContaining("ANSEL"),
    });
    await expect(gateway.readText("tree.ged")).resolves.toBe(ansel);
  });

  it("is written where the file declares UTF-8, or declares nothing", async () => {
    for (const text of ["0 HEAD\n1 CHAR UTF-8\n0 TRLR\n", "0 HEAD\n0 TRLR\n"]) {
      await expect(save(document(), text, folder())).resolves.toMatchObject({
        kind: "written",
      });
    }
  });
});

describe("whether saving is offered at all", () => {
  it("is offered for a GEDCOM document and for nothing else", () => {
    expect(saveAvailability(document(), folder(), true)).toEqual({
      save: true,
      saveAs: true,
    });
    expect(
      saveAvailability(
        document({ kind: "image", name: "portrait.jpg" }),
        folder(),
        true,
      ),
    ).toEqual({ save: false, saveAs: false });
    expect(saveAvailability(null, folder(), true)).toEqual({
      save: false,
      saveAs: false,
    });
  });

  // The dialog asks for the folder itself, so a workspace of one file can still
  // be saved as a copy — where the browser has the dialog at all.
  it("offers saving as wherever the dialog exists, and never without it", () => {
    const single = createSingleFileGateway("tree.ged", "0 HEAD\n", vi.fn());

    expect(saveAvailability(document(), single, true)).toEqual({
      save: true,
      saveAs: true,
    });
    expect(saveAvailability(document(), single, false)).toEqual({
      save: true,
      saveAs: false,
    });
  });
});
