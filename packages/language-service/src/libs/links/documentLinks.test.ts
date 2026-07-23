import { describe, expect, it } from "vitest";
import { GedcomLanguageService } from "../../languageService";

describe("document links", () => {
  it("recognizes web URLs and relative and absolute FILE values", () => {
    const service = new GedcomLanguageService(
      [
        "0 @I1@ INDI",
        "1 WWW https://example.org/person/1",
        "1 OBJE",
        "2 FILE media/portrait.jpg",
        "2 FILE /Users/example/portrait.jpg",
        "1 NOTE https://example.org/not-a-link",
      ].join("\n"),
    );

    expect(service.getDocumentLinks()).toEqual([
      {
        range: {
          start: { line: 1, character: 6 },
          end: { line: 1, character: 34 },
        },
        targetText: "https://example.org/person/1",
        kind: "http",
      },
      {
        range: {
          start: { line: 3, character: 7 },
          end: { line: 3, character: 25 },
        },
        targetText: "media/portrait.jpg",
        kind: "file-relative",
      },
      {
        range: {
          start: { line: 4, character: 7 },
          end: { line: 4, character: 34 },
        },
        targetText: "/Users/example/portrait.jpg",
        kind: "file-absolute",
      },
    ]);
  });

  it("ignores malformed and unsafe URL schemes", () => {
    const service = new GedcomLanguageService(
      ["0 @I1@ INDI", "1 WWW javascript:alert(1)", "1 WWW https://"].join(
        "\n",
      ),
    );
    expect(service.getDocumentLinks()).toEqual([]);
  });
});
