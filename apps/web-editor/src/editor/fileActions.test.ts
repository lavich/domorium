// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";

import { downloadGedcom, readGedcomFile } from "./fileActions";

describe("fileActions", () => {
  it("reads an accepted GEDCOM file without changing text", async () => {
    const file = new File(["0 HEAD\r\n0 TRLR\r\n"], "family.ged", {
      type: "text/plain",
    });

    await expect(readGedcomFile(file)).resolves.toEqual({
      fileName: "family.ged",
      text: "0 HEAD\r\n0 TRLR\r\n",
    });
  });

  it("rejects unsupported extensions", async () => {
    await expect(readGedcomFile(new File(["x"], "family.txt"))).rejects.toThrow(
      "Choose a .ged or .gedcom file",
    );
  });

  it("downloads and revokes an object URL", () => {
    const browser = {
      createObjectURL: vi.fn(() => "blob:test"),
      revokeObjectURL: vi.fn(),
      click: vi.fn(),
    };

    downloadGedcom("0 HEAD", "family.ged", browser);

    expect(browser.click).toHaveBeenCalledWith(
      "blob:test",
      "family-edited.ged",
    );
    expect(browser.revokeObjectURL).toHaveBeenCalledWith("blob:test");
  });
});
