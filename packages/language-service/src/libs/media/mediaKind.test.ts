import { describe, expect, it } from "vitest";

// The closed list is the 5.5.1 schema's, not ours: read it here so adding a
// format to the schema fails this test rather than passing in silence.
import g551validation from "../../../../validator/src/schemes/g551validation.json";
import { GEDCOM_551_FORMAT_KINDS, mediaKind } from "./mediaKind";

const PERMITTED_551_FORMATS = Object.keys(
  g551validation.set[
    "https://gedcom.io/terms/v5.5.1/enumset-MULTIMEDIA_FORMAT"
  ],
);

describe("what the format says a file is", () => {
  it("reads a GEDCOM 7 media type", () => {
    expect(mediaKind("image/jpeg", "family.jpg", "7.0")).toBe("image");
    expect(mediaKind("audio/mpeg", "voice.mp3", "7.0")).toBe("audio");
    expect(mediaKind("video/mp4", "wedding.mp4", "7.0")).toBe("video");
    expect(mediaKind("text/plain", "notes.txt", "7.0")).toBe("document");
    expect(mediaKind("application/pdf", "will.pdf", "7.0")).toBe("document");
  });

  it("reads a media type carrying parameters", () => {
    expect(mediaKind("text/plain; charset=utf-8", "notes.txt", "7.0")).toBe(
      "document",
    );
  });

  it("reads a format from the closed list of GEDCOM 5.5.1", () => {
    expect(mediaKind("jpg", "family.jpg", "5.5.1")).toBe("image");
    expect(mediaKind("wav", "voice.wav", "5.5.1")).toBe("audio");
  });

  it("reads an embedded-object format as unknown, whatever the extension says", () => {
    expect(mediaKind("ole", "family.jpg", "5.5.1")).toBe("unknown");
  });

  it("falls back to the extension where no format is declared", () => {
    expect(mediaKind(undefined, "family.png", "7.0")).toBe("image");
    expect(mediaKind(undefined, "family.xyz", "7.0")).toBe("unknown");
    expect(mediaKind("", "family.png", "5.5.1")).toBe("image");
  });

  it("falls back to the extension where the declared format is not the dialect's", () => {
    expect(mediaKind("jpg", "family.jpg", "7.0")).toBe("image");
    expect(mediaKind("image/jpeg", "family.jpg", "5.5.1")).toBe("image");
  });

  it("reads the extension of a URL, past its query and fragment", () => {
    expect(
      mediaKind(undefined, "https://example.org/p.jpg?size=full#top", "7.0"),
    ).toBe("image");
  });

  it("is unknown where nothing says anything", () => {
    expect(mediaKind(undefined, "family", "7.0")).toBe("unknown");
    expect(mediaKind(undefined, "family.jpg", undefined)).toBe("image");
  });

  it("names the same formats the 5.5.1 schema permits", () => {
    expect(Object.keys(GEDCOM_551_FORMAT_KINDS).sort()).toEqual(
      PERMITTED_551_FORMATS.sort(),
    );
  });

  it("classifies every format the 5.5.1 schema permits", () => {
    for (const format of PERMITTED_551_FORMATS) {
      expect(mediaKind(format, `family.${format}`, "5.5.1")).toBeTypeOf(
        "string",
      );
    }
  });
});
