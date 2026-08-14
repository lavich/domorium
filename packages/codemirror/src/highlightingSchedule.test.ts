// @vitest-environment jsdom
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";
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

  // A highlight style answers with the most specific rule it has and no other,
  // so a declaration asked for by its modifier alone would arrive without the
  // colour the host stated for a pointer.
  it("keeps the tag's own class beside the one its modifier earns", () => {
    const style = HighlightStyle.define([
      { tag: tags.variableName, color: "rgb(1, 2, 3)" },
      { tag: tags.definition(tags.variableName), fontWeight: "600" },
    ]);
    const language = new EditorLanguageService();
    const view = new EditorView({
      parent: document.body,
      state: EditorState.create({
        doc: text,
        extensions: [
          ...createGedcomExtensions({
            actions: { applyWorkspaceEdit: () => true },
            language,
            settings: { diagnostics: false },
          }),
          ...createStandaloneEditorExtensions(),
          syntaxHighlighting(style),
        ],
      }),
    });

    const spanOn = (prefix: string) => {
      const line = [...view.dom.querySelectorAll(".cm-line")].find((element) =>
        // The indentation hint is a widget, and its text comes first.
        (element.textContent ?? "").trim().startsWith(prefix),
      );
      return [...(line?.querySelectorAll("span") ?? [])].find(
        (element) => element.textContent === "@I1@",
      );
    };

    const declaration = spanOn("0 @I1@");
    const reference = spanOn("1 HUSB");

    expect(getComputedStyle(declaration!).fontWeight).toBe("600");
    expect(getComputedStyle(declaration!).color, "and its colour").toBe(
      "rgb(1, 2, 3)",
    );
    expect(getComputedStyle(reference!).fontWeight).not.toBe("600");
    view.destroy();
  });

  // The occurrences of the identifier under the caret are answered by
  // `getReferenceHighlightSpecs` and painted by nobody: a host that wants them
  // marked says so itself.
  it("paints nothing for the identifier under the caret", () => {
    const language = new EditorLanguageService();
    const view = editorWith(language, document.body);
    const declaration = text.indexOf("@I1@");

    view.dispatch({ selection: { anchor: declaration + 1 } });

    expect(
      view.dom.querySelectorAll("[class*='gedcom-reference']"),
    ).toHaveLength(0);
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

  // Decorations are placed from the syntax tree's offsets rather than by
  // converting a line and character back into one. The two only agree because
  // the service is fed the document CodeMirror holds, which has already had
  // its line endings normalized — so a CRLF source is the case to pin down.
  it.each([
    ["LF", "\n"],
    ["CRLF", "\r\n"],
  ])("decorates the xref itself, %s", (_name, separator) => {
    const language = new EditorLanguageService();
    const view = new EditorView({
      parent: document.body,
      state: EditorState.create({
        doc: ["0 @I1@ INDI", "1 NAME Ada /Lovelace/", "0 TRLR"].join(separator),
        extensions: [
          ...createGedcomExtensions({
            actions: { applyWorkspaceEdit: () => true },
            language,
            settings: { diagnostics: false },
          }),
          ...createStandaloneEditorExtensions(),
        ],
      }),
    });

    const decorated = [
      ...view.dom.querySelectorAll(".gedcom-token-declaration"),
    ];

    expect(decorated.map((node) => node.textContent)).toEqual(["@I1@"]);
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
