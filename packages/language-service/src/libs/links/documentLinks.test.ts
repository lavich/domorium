import { describe, expect, it } from "vitest";
import { GedcomLanguageService } from "../../languageService";

describe("document links", () => {
  it("recognizes web URLs and relative and absolute FILE values", () => {
    const service = new GedcomLanguageService(
      [
        "0 HEAD",
        "1 GEDC",
        "2 VERS 7.0",
        "0 @I1@ INDI",
        "1 WWW https://example.org/person/1",
        "1 OBJE",
        "2 FILE media/portrait.jpg",
        "2 FILE file:///Users/example/portrait.jpg",
        "1 NOTE https://example.org/not-a-link",
      ].join("\n"),
    );

    expect(service.getDocumentLinks()).toEqual([
      {
        range: {
          start: { line: 4, character: 6 },
          end: { line: 4, character: 34 },
        },
        targetText: "https://example.org/person/1",
        kind: "http",
      },
      {
        range: {
          start: { line: 6, character: 7 },
          end: { line: 6, character: 25 },
        },
        targetText: "media/portrait.jpg",
        kind: "file-relative",
      },
      {
        range: {
          start: { line: 7, character: 7 },
          end: { line: 7, character: 41 },
        },
        targetText: "file:///Users/example/portrait.jpg",
        kind: "file-absolute",
      },
    ]);
  });

  it("rejects raw absolute, parent, and backslash paths in GEDCOM 7", () => {
    const service = new GedcomLanguageService(
      [
        "0 HEAD",
        "1 GEDC",
        "2 VERS 7.0",
        "0 @O1@ OBJE",
        "1 FILE /Users/example/photo.jpg",
        "1 FILE C:\\Genealogy\\photo.jpg",
        "1 FILE ../photo.jpg",
      ].join("\n"),
    );

    expect(service.getDocumentLinks()).toEqual([]);
  });

  it("accepts historical absolute system paths in GEDCOM 5.5.1", () => {
    const service = new GedcomLanguageService(
      [
        "0 HEAD",
        "1 GEDC",
        "2 VERS 5.5.1",
        "0 @O1@ OBJE",
        "1 FILE /Users/example/photo.jpg",
        "1 FILE C:\\Genealogy\\photo.jpg",
      ].join("\n"),
    );

    expect(service.getDocumentLinks().map(({ kind, targetText }) => ({
      kind,
      targetText,
    }))).toEqual([
      {
        kind: "file-absolute",
        targetText: "/Users/example/photo.jpg",
      },
      {
        kind: "file-absolute",
        targetText: "C:\\Genealogy\\photo.jpg",
      },
    ]);
  });

  it("ignores malformed and unsafe URL schemes", () => {
    const service = new GedcomLanguageService(
      [
        "0 HEAD",
        "1 GEDC",
        "2 VERS 7.0",
        "0 @I1@ INDI",
        "1 WWW javascript:alert(1)",
        "1 WWW https://",
      ].join("\n"),
    );
    expect(service.getDocumentLinks()).toEqual([]);
  });
});
