// @vitest-environment jsdom
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { describe, expect, it, vi } from "vitest";

import {
  createGedcomExtensions,
  createStandaloneEditorExtensions,
} from "./extensions";
import { EditorLanguageService } from "./service";

const text = [
  "0 HEAD",
  "1 GEDC",
  "2 VERS 7.0",
  "0 @I1@ INDI",
  "1 NAME Ada /Lovelace/",
  "0 @F1@ FAM",
  "1 HUSB @I1@",
  "0 TRLR",
].join("\n");

const editorWith = (language: EditorLanguageService, parent?: HTMLElement) =>
  new EditorView({
    parent,
    state: EditorState.create({
      doc: text,
      // The same set a host assembles, so that anything asking the language
      // service on the input path is in scope. The fold gutter lives in the
      // standalone half, and leaving it out is how it went unnoticed.
      extensions: [
        ...createGedcomExtensions({
          actions: { applyWorkspaceEdit: () => true },
          language,
          // The linter has its own debounce; this is about everything else.
          settings: { diagnostics: false },
        }),
        ...createStandaloneEditorExtensions(),
      ],
    }),
  });

describe("highlighting schedule", () => {
  // Reparsing and revalidating the whole document is what makes typing lag on
  // a large file — 447 ms of a keystroke's 590 ms at 3.1 MB. The version only
  // moves when the service actually reparses, so it measures exactly that.
  it("does not reparse the document on the input path", () => {
    const language = new EditorLanguageService();
    const view = editorWith(language);
    const parsed = language.getVersion();

    view.dispatch({ changes: { from: 0, insert: "0 NOTE typed\n" } });

    expect(language.getVersion()).toBe(parsed);
    view.destroy();
  });

  // Deferring the rebuild must not mean dropping what is already painted, or
  // the file would flash grey on every keystroke. The decorations are mapped
  // through the change instead, which is what keeps them on their text.
  it("keeps the decorations already painted while the rebuild is pending", () => {
    const language = new EditorLanguageService();
    const view = editorWith(language, document.body);
    const before = view.dom.querySelectorAll(
      ".gedcom-token-declaration",
    ).length;
    expect(before).toBeGreaterThan(0);

    view.dispatch({ changes: { from: 0, insert: "0 NOTE typed\n" } });

    expect(view.dom.querySelectorAll(".gedcom-token-declaration")).toHaveLength(
      before,
    );
    view.destroy();
  });

  it("reparses once after the typing stops, not once per keystroke", () => {
    vi.useFakeTimers();
    const language = new EditorLanguageService();
    const view = editorWith(language);
    const parsed = language.getVersion();

    view.dispatch({ changes: { from: 0, insert: "0 NOTE one\n" } });
    view.dispatch({ changes: { from: 0, insert: "0 NOTE two\n" } });
    expect(language.getVersion()).toBe(parsed);

    vi.advanceTimersByTime(1000);

    expect(language.getVersion()).toBe(parsed + 1);
    view.destroy();
    vi.useRealTimers();
  });
});
