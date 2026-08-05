import { describe, expect, it } from "vitest";

import {
  createDemoSession,
  documentSessionReducer,
  downloadName,
  isGedcomFileName,
  isModified,
} from "./documentSession";

describe("documentSession", () => {
  it("tracks edits and a downloaded baseline", () => {
    const demo = createDemoSession("0 HEAD\n0 TRLR\n");
    const edited = documentSessionReducer(demo, {
      type: "edit",
      text: "0 HEAD\n1 GEDC\n0 TRLR\n",
    });

    expect(isModified(edited)).toBe(true);
    expect(
      isModified(documentSessionReducer(edited, { type: "downloaded" })),
    ).toBe(false);
  });

  it("replaces demo with a file using a new editor key", () => {
    const demo = createDemoSession("demo");
    const loaded = documentSessionReducer(demo, {
      type: "file-loaded",
      fileName: "family.ged",
      text: "family",
    });

    expect(loaded).toMatchObject({
      source: "file",
      fileName: "family.ged",
      text: "family",
    });
    expect(loaded.editorKey).toBeGreaterThan(demo.editorKey);
  });

  it("resets a loaded file to the demo", () => {
    const loaded = documentSessionReducer(createDemoSession("demo"), {
      type: "file-loaded",
      fileName: "family.gedcom",
      text: "family",
    });

    expect(
      documentSessionReducer(loaded, {
        type: "reset-demo",
        text: "new demo",
      }),
    ).toEqual({
      editorKey: 2,
      source: "demo",
      fileName: "example.ged",
      text: "new demo",
      downloadedText: "new demo",
    });
  });

  it.each(["tree.ged", "TREE.GEDCOM"])("accepts %s", (name) => {
    expect(isGedcomFileName(name)).toBe(true);
  });

  it.each(["tree.txt", "tree.ged.zip", "ged"])("rejects %s", (name) => {
    expect(isGedcomFileName(name)).toBe(false);
  });

  it("adds edited before either supported extension", () => {
    expect(downloadName("family.ged")).toBe("family-edited.ged");
    expect(downloadName("family.GEDCOM")).toBe("family-edited.GEDCOM");
  });
});
