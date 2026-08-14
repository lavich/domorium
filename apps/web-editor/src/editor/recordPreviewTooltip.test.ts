// @vitest-environment jsdom
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { showTooltip } from "@codemirror/view";
import {
  EditorLanguageService,
  findRecordPreview,
  type RecordPreview,
} from "@domorium/codemirror";
import { tags } from "@lezer/highlight";
import { describe, expect, it } from "vitest";

import {
  buildPreviewDom,
  recordPreviewTooltip,
  setRecordPreview,
} from "./recordPreviewTooltip";

const highlightStyle = HighlightStyle.define([
  { tag: tags.variableName, class: "tok-pointer" },
]);

const text = [
  "0 HEAD",
  "1 GEDC",
  "2 VERS 7.0",
  "0 @I1@ INDI",
  "1 FAMS @F1@",
  "0 @F1@ FAM",
  "1 HUSB @I1@",
  "0 TRLR",
].join("\n");

const language = new EditorLanguageService();

function create() {
  const state = EditorState.create({
    doc: text,
    extensions: [
      syntaxHighlighting(highlightStyle),
      recordPreviewTooltip(language),
    ],
  });
  language.update(state.doc);
  return state;
}

function previewOfF1(state: EditorState): RecordPreview {
  const pointer = state.doc.line(5).from + 8;
  const preview = findRecordPreview(state, language, pointer, 20);
  if (!preview) {
    throw new Error("the fixture stopped resolving @F1@");
  }
  return preview;
}

function tooltips(state: EditorState) {
  return state.facet(showTooltip).filter((tooltip) => tooltip !== null);
}

describe("record preview tooltip", () => {
  it("shows nothing until a preview is set", () => {
    expect(tooltips(create())).toEqual([]);
  });

  it("anchors the tooltip to the pointer, not to the record it names", () => {
    const state = create();
    const preview = previewOfF1(state);
    const next = state.update({
      effects: setRecordPreview.of(preview),
    }).state;

    expect(tooltips(next)).toHaveLength(1);
    expect(tooltips(next)[0]?.pos).toBe(preview.pointer.from);
  });

  it("hides the tooltip when the preview is cleared", () => {
    const state = create();
    let next = state.update({
      effects: setRecordPreview.of(previewOfF1(state)),
    }).state;
    next = next.update({ effects: setRecordPreview.of(null) }).state;

    expect(tooltips(next)).toEqual([]);
  });

  it("hides the tooltip on an edit rather than describing text that moved", () => {
    const state = create();
    let next = state.update({
      effects: setRecordPreview.of(previewOfF1(state)),
    }).state;
    next = next.update({ changes: { from: 0, insert: "0 NOTE x\n" } }).state;

    expect(tooltips(next)).toEqual([]);
  });
});

describe("painting the preview", () => {
  it("writes the record with the editor's own highlight classes", () => {
    const state = create();
    const dom = buildPreviewDom(state, language, previewOfF1(state));

    expect(dom.textContent).toBe("0 @F1@ FAM\n1 HUSB @I1@");
    expect(
      [...dom.querySelectorAll(".tok-pointer")].map((el) => el.textContent),
    ).toEqual(["@F1@", "@I1@"]);
  });

  it("marks a record cut short so the reader knows it continues", () => {
    const state = create();
    const pointer = state.doc.line(5).from + 8;
    const preview = findRecordPreview(state, language, pointer, 1);

    expect(buildPreviewDom(state, language, preview!).textContent).toBe(
      "0 @F1@ FAM\n…",
    );
  });
});
