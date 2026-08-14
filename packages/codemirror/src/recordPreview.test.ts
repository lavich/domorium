import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { tags } from "@lezer/highlight";
import { semanticTokenLegend } from "@domorium/language-service";
import { describe, expect, it } from "vitest";

import {
  findRecordPreview,
  getRecordPreviewRuns,
  toPreviewRuns,
} from "./recordPreview.js";
import { EditorLanguageService } from "./service.js";

const highlightStyle = HighlightStyle.define([
  { tag: tags.comment, class: "tok-level" },
  { tag: tags.keyword, class: "tok-tag" },
  { tag: tags.variableName, class: "tok-pointer" },
  { tag: tags.string, class: "tok-value" },
]);

function load(lines: string[]) {
  const state = EditorState.create({
    doc: lines.join("\n"),
    extensions: [syntaxHighlighting(highlightStyle)],
  });
  const language = new EditorLanguageService();
  language.update(state.doc);
  return { state, language };
}

function offsetAt(state: EditorState, line: number, character: number) {
  return state.doc.line(line + 1).from + character;
}

const { state, language } = load([
  "0 HEAD",
  "1 GEDC",
  "2 VERS 7.0",
  "0 @I1@ INDI",
  "1 NAME Marie /Curie/",
  "1 FAMS @F1@",
  "0 @F1@ FAM",
  "1 HUSB @I2@",
  "1 WIFE @I1@",
  "0 @I2@ INDI",
  "0 TRLR",
]);

describe("locating the record a pointer names", () => {
  it("spans the record, not the line the pointer is on", () => {
    expect(
      findRecordPreview(state, language, offsetAt(state, 5, 8), 20),
    ).toEqual({
      from: state.doc.line(7).from,
      to: state.doc.line(9).to,
      truncated: false,
      pointer: { from: offsetAt(state, 5, 7), to: offsetAt(state, 5, 11) },
    });
  });

  it("spans a record with nothing beneath it, which folding does not cover", () => {
    expect(
      findRecordPreview(state, language, offsetAt(state, 7, 8), 20),
    ).toMatchObject({
      from: state.doc.line(10).from,
      to: state.doc.line(10).to,
      truncated: false,
    });
  });

  it("declines the declaration itself: it is the line being pointed at", () => {
    expect(
      findRecordPreview(state, language, offsetAt(state, 6, 3), 20),
    ).toBeNull();
  });

  it("declines anything that is not a pointer", () => {
    expect(
      findRecordPreview(state, language, offsetAt(state, 4, 3), 20),
    ).toBeNull();
  });

  it("declines a pointer that names no record", () => {
    const dangling = load([
      "0 HEAD",
      "1 GEDC",
      "2 VERS 7.0",
      "0 @I1@ INDI",
      "1 FAMS @NOPE@",
      "0 TRLR",
    ]);
    expect(
      findRecordPreview(
        dangling.state,
        dangling.language,
        offsetAt(dangling.state, 4, 8),
        20,
      ),
    ).toBeNull();
  });

  it("reports a record cut short rather than spanning the whole of it", () => {
    expect(
      findRecordPreview(state, language, offsetAt(state, 5, 8), 2),
    ).toMatchObject({
      from: state.doc.line(7).from,
      to: state.doc.line(8).to,
      truncated: true,
    });
  });
});

describe("splitting a record into runs", () => {
  const from = state.doc.line(7).from;
  const to = state.doc.line(9).to;

  it("keeps the text between tokens, so the record reads as it is written", () => {
    const runs = toPreviewRuns(
      state.doc,
      from,
      to,
      language.update(state.doc).getSemanticTokens({ from, to }),
    );

    expect(runs.map((run) => run.text).join("")).toBe(
      state.doc.sliceString(from, to),
    );
    // Named rather than numbered: the index is the legend's order, and that
    // order changed once a tag became a keyword and an identifier a variable.
    const named = (index: number | null) =>
      index === null ? "-" : semanticTokenLegend.tokenTypes[index];

    expect(
      runs.slice(0, 6).map((run) => `${named(run.tokenType)}:${run.text}`),
    ).toEqual([
      "comment:0",
      "-: ",
      "variable:@F1@",
      "-: ",
      "keyword:FAM",
      "-:\n",
    ]);
  });

  it("clips a token that runs past the end of a record cut short", () => {
    const runs = toPreviewRuns(state.doc, from, from + 4, [
      { startOffset: from, endOffset: from + 1, tokenType: 0 },
      { startOffset: from + 2, endOffset: from + 6, tokenType: 1 },
    ]);

    expect(runs.map((run) => `${run.tokenType ?? "-"}:${run.text}`)).toEqual([
      "0:0",
      "-: ",
      "1:@F",
    ]);
  });

  it("ignores a token that falls outside the record entirely", () => {
    const runs = toPreviewRuns(state.doc, from, from + 1, [
      { startOffset: from + 20, endOffset: from + 24, tokenType: 1 },
    ]);

    expect(runs.map((run) => `${run.tokenType ?? "-"}:${run.text}`)).toEqual([
      "-:0",
    ]);
  });
});

describe("painting a record preview", () => {
  it("carries the host's own highlight classes, so a preview matches its editor", () => {
    const preview = findRecordPreview(
      state,
      language,
      offsetAt(state, 5, 8),
      20,
    );

    expect(
      getRecordPreviewRuns(state, language, preview!)
        .slice(0, 5)
        .map((run) => `${run.className ?? "-"}:${run.text}`),
    ).toEqual(["tok-level:0", "-: ", "tok-pointer:@F1@", "-: ", "tok-tag:FAM"]);
  });

  it("leaves runs unclassed when the host installed no highlight style", () => {
    const bare = EditorState.create({ doc: state.doc.toString() });
    const preview = findRecordPreview(
      bare,
      language,
      offsetAt(state, 5, 8),
      20,
    );

    expect(
      getRecordPreviewRuns(bare, language, preview!).every(
        (run) => run.className === null,
      ),
    ).toBe(true);
  });
});
