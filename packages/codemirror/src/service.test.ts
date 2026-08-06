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
