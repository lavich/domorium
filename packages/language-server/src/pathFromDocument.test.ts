import { describe, expect, it } from "vitest";

import { pathFromDocument } from "./pathFromDocument";

describe("a file's path as a document beside it would write it", () => {
  it("names a file in the document's own folder by its name", () => {
    expect(
      pathFromDocument("file:///tree/tree.ged", "file:///tree/a.jpg"),
    ).toBe("a.jpg");
  });

  it("descends into a subfolder", () => {
    expect(
      pathFromDocument("file:///tree/tree.ged", "file:///tree/media/a.jpg"),
    ).toBe("media/a.jpg");
  });

  it("climbs out of the document's folder with ..", () => {
    expect(
      pathFromDocument(
        "file:///tree/family/tree.ged",
        "file:///tree/photos/a.jpg",
      ),
    ).toBe("../photos/a.jpg");
  });

  it("decodes what the URI escapes, since a payload is written as a plain path", () => {
    expect(
      pathFromDocument(
        "file:///my%20tree/tree.ged",
        "file:///my%20tree/my%20photo.jpg",
      ),
    ).toBe("my photo.jpg");
  });

  it("reads a drive letter the same whichever case and escape it comes in", () => {
    expect(
      pathFromDocument(
        "file:///c%3A/tree/tree.ged",
        "file:///C:/tree/media/a.jpg",
      ),
    ).toBe("media/a.jpg");
  });

  it("names nothing on another drive", () => {
    expect(
      pathFromDocument("file:///c%3A/tree/tree.ged", "file:///d%3A/tree/a.jpg"),
    ).toBeUndefined();
  });

  it("names nothing across schemes or hosts", () => {
    expect(
      pathFromDocument(
        "file:///tree/tree.ged",
        "vscode-vfs://github/tree/a.jpg",
      ),
    ).toBeUndefined();
    expect(
      pathFromDocument(
        "vscode-vfs://github/tree/tree.ged",
        "vscode-vfs://gitlab/tree/a.jpg",
      ),
    ).toBeUndefined();
  });

  it("names nothing from a document that has no folder", () => {
    expect(
      pathFromDocument("untitled:Untitled-1", "file:///tree/a.jpg"),
    ).toBeUndefined();
  });

  it("names nothing whose name holds a separator a payload would split on", () => {
    expect(
      pathFromDocument("file:///w/tree.ged", "file:///w/a%5Cb.jpg"),
    ).toBeUndefined();
    expect(
      pathFromDocument("file:///w/tree.ged", "file:///w/a%2Fb.jpg"),
    ).toBeUndefined();
  });
});
