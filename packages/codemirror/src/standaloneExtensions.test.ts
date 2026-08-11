// @vitest-environment jsdom
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";

import { createStandaloneEditorExtensions } from "./extensions";

let view: EditorView | undefined;

afterEach(() => {
  view?.destroy();
  view = undefined;
});

function gutters(
  options?: Parameters<typeof createStandaloneEditorExtensions>[0],
) {
  view = new EditorView({
    parent: document.createElement("div"),
    state: EditorState.create({
      doc: "0 HEAD\n0 TRLR",
      extensions: createStandaloneEditorExtensions(options),
    }),
  });
  return [...view.dom.querySelectorAll(".cm-gutter")].map((el) => el.className);
}

describe("the standalone editor preset", () => {
  it("installs the lint gutter by default", () => {
    expect(gutters().some((name) => name.includes("cm-gutter-lint"))).toBe(
      true,
    );
  });

  it("leaves the lint gutter out for a host whose diagnostics are off", () => {
    expect(
      gutters({ diagnostics: false }).some((name) =>
        name.includes("cm-gutter-lint"),
      ),
    ).toBe(false);
  });

  it("keeps the rest of the preset when diagnostics are off", () => {
    expect(
      gutters({ diagnostics: false }).some((name) =>
        name.includes("cm-lineNumbers"),
      ),
    ).toBe(true);
  });
});
