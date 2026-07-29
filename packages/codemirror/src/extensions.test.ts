import { EditorState } from "@codemirror/state";
import { tags } from "@lezer/highlight";
import { describe, expect, it, vi } from "vitest";

import * as extensionsModule from "./extensions";
import {
  getDiagnosticActions,
  getReferenceHighlightSpecs,
} from "./extensions";
import { EditorLanguageService } from "./service";

const text = [
  "0 HEAD",
  "1 GEDC",
  "2 VERS 7.0",
  "0 @I1@ INDI",
  "0 @F1@ FAM",
  "1 HUSB @I1@",
  "1 WIFE @I9@",
  "0 TRLR",
].join("\n");

describe("GEDCOM editor extensions", () => {
  it("maps language-service semantic token types to CodeMirror theme tags", () => {
    expect("semanticTokenTag" in extensionsModule).toBe(true);
    const semanticTokenTag = Reflect.get(extensionsModule, "semanticTokenTag");
    expect(semanticTokenTag(0)).toBe(tags.comment);
    expect(semanticTokenTag(1)).toBe(tags.keyword);
    expect(semanticTokenTag(2)).toBe(tags.string);
  });

  it("maps declaration and use highlights at the selection", () => {
    const language = new EditorLanguageService();
    const declaration = text.indexOf("@I1@");
    const state = EditorState.create({
      doc: text,
      selection: { anchor: declaration + 1 },
    });

    expect(getReferenceHighlightSpecs(state, language)).toMatchObject([
      { kind: "write" },
      { kind: "read" },
    ]);
  });

  it("exposes safe language-service quick fixes as lint actions", () => {
    const language = new EditorLanguageService();
    language.update(text);
    const diagnostic = language.service
      .getDiagnostics()
      .find(({ code }) => code === "unresolved-xref")!;
    const apply = vi.fn(() => true);

    const actions = getDiagnosticActions(language, diagnostic, apply);

    expect(actions.map(({ name }) => name)).toEqual(expect.arrayContaining([
      "Replace @I9@ with @I1@",
      "Create INDI record @I9@",
    ]));
    actions[0].apply();
    expect(apply).toHaveBeenCalledOnce();
  });

  it("contains platform callback failures inside lint actions", () => {
    const language = new EditorLanguageService();
    language.update(text);
    const diagnostic = language.service
      .getDiagnostics()
      .find(({ code }) => code === "unresolved-xref")!;
    const actions = getDiagnosticActions(language, diagnostic, () => {
      throw new Error("host failed");
    });

    expect(() => actions[0].apply()).not.toThrow();
  });
});
