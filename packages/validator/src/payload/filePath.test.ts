import { describe, expect, it } from "vitest";

import { filePathProblem } from "./filePath";

describe("a GEDCOM 7 local file path", () => {
  it("names a file beside the document", () => {
    expect(filePathProblem("photo.jpg")).toBeUndefined();
    expect(filePathProblem("media/photo.jpg")).toBeUndefined();
    expect(filePathProblem("./media/a%3Fb.jpg")).toBeUndefined();
  });

  it("is absolute from a leading separator or a drive letter", () => {
    expect(filePathProblem("/photo.jpg")).toBe("absolute");
    expect(filePathProblem("\\\\server\\photo.jpg")).toBe("absolute");
    expect(filePathProblem("C:\\photos\\photo.jpg")).toBe("absolute");
    expect(filePathProblem("c:/photo.jpg")).toBe("absolute");
  });

  it("leaves the folder through a parent segment", () => {
    expect(filePathProblem("../photo.jpg")).toBe("parent-folder");
    expect(filePathProblem("media/../../photo.jpg")).toBe("parent-folder");
    expect(filePathProblem("media/..photo.jpg")).toBeUndefined();
  });

  it("holds a character that only an escape can carry", () => {
    expect(filePathProblem("media\\photo.jpg")).toBe("unescaped-character");
    expect(filePathProblem("a?b.jpg")).toBe("unescaped-character");
    expect(filePathProblem("a#b.jpg")).toBe("unescaped-character");
    expect(filePathProblem("media/a:b.jpg")).toBe("unescaped-character");
  });
});
