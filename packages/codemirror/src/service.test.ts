import { Text } from "@codemirror/state";
import { describe, expect, it, vi } from "vitest";

import { EditorLanguageService, toCodeMirrorChanges } from "./service";

describe("EditorLanguageService", () => {
  // Every hover, completion and highlight asks the service to update. Reading
  // the document out as a string to discover it has not changed costs the
  // whole document each time; CodeMirror's Text is immutable, so identity
  // answers the same question without touching the content.
  it("does not read out the document when handed the same text object", () => {
    const language = new EditorLanguageService();
    const doc = Text.of(["0 HEAD", "0 TRLR"]);
    language.update(doc);

    const toString = vi.spyOn(doc, "toString");
    const service = language.update(doc);

    expect(toString).not.toHaveBeenCalled();
    expect(service).toBe(language.service);
  });

  // The fold gutter runs on the input path and cannot force a reparse, but a
  // stale parse would put its markers on the wrong lines. It gets an answer
  // only while the parse still matches the document.
  it("hands out the current service only while the document matches", () => {
    const language = new EditorLanguageService();
    const doc = Text.of(["0 HEAD", "0 TRLR"]);
    language.update(doc);

    expect(language.current(doc)).toBe(language.service);
    expect(language.current(Text.of(["0 HEAD", "1 NOTE", "0 TRLR"]))).toBe(
      undefined,
    );
    expect(language.getVersion()).toBe(1);
  });

  it("keeps the version when a different text object holds the same content", () => {
    const language = new EditorLanguageService();
    language.update(Text.of(["0 HEAD", "0 TRLR"]));
    const version = language.getVersion();

    language.update(Text.of(["0 HEAD", "0 TRLR"]));

    expect(language.getVersion()).toBe(version);
  });

  it("reuses an unchanged snapshot and increments versions only on changes", () => {
    const language = new EditorLanguageService();
    const first = language.update("0 HEAD\n0 TRLR");
    const version = language.getVersion();

    expect(language.update("0 HEAD\n0 TRLR")).toBe(first);
    expect(language.getVersion()).toBe(version);

    language.update("0 HEAD");
    expect(language.getVersion()).toBe(version + 1);
  });
});

describe("toCodeMirrorChanges", () => {
  const document = Text.of(["0 @I1@ INDI", "1 FAMC @F1@"]);

  it("converts a current non-overlapping workspace edit", () => {
    expect(
      toCodeMirrorChanges(
        document,
        {
          version: 3,
          edits: [
            {
              range: {
                start: { line: 0, character: 2 },
                end: { line: 0, character: 6 },
              },
              newText: "@I2@",
            },
          ],
        },
        3,
      ),
    ).toEqual([{ from: 2, to: 6, insert: "@I2@" }]);
  });

  it("rejects stale, invalid, reversed, and overlapping edits", () => {
    expect(
      toCodeMirrorChanges(document, { version: 2, edits: [] }, 3),
    ).toBeNull();
    expect(
      toCodeMirrorChanges(
        document,
        {
          version: 3,
          edits: [
            {
              range: {
                start: { line: 99, character: 0 },
                end: { line: 99, character: 0 },
              },
              newText: "invalid",
            },
          ],
        },
        3,
      ),
    ).toBeNull();
    expect(
      toCodeMirrorChanges(
        document,
        {
          version: 3,
          edits: [
            {
              range: {
                start: { line: 0, character: 6 },
                end: { line: 0, character: 2 },
              },
              newText: "@I2@",
            },
          ],
        },
        3,
      ),
    ).toBeNull();
    expect(
      toCodeMirrorChanges(
        document,
        {
          version: 3,
          edits: [
            {
              range: {
                start: { line: 0, character: 2 },
                end: { line: 0, character: 6 },
              },
              newText: "@I2@",
            },
            {
              range: {
                start: { line: 0, character: 4 },
                end: { line: 0, character: 6 },
              },
              newText: "2@",
            },
          ],
        },
        3,
      ),
    ).toBeNull();
  });
});

describe("text that is part of a document rather than one of its own", () => {
  it("checks a fenced block against the dialect the host names", () => {
    const fragment = new EditorLanguageService({
      fragment: true,
      dialect: "7.0",
    });

    const codes = fragment
      .update("0 @I1@ INDI\n1 NAME Homer /Simpson/\n1 NOPE x")
      .getDiagnostics()
      .map((diagnostic) => diagnostic.code);

    expect(codes).toContain("VAL001");
    expect(codes).not.toContain("VAL002");
    expect(codes).not.toContain("VAL012");
  });
});
