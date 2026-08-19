// @vitest-environment jsdom
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it, vi } from "vitest";

import { hoveredPointer, setHoveredPointer } from "./hoveredPointer.js";
import {
  clearRecordPreview,
  previewTransition,
  recordPreviewHover,
} from "./recordPreviewHover.js";
import type { RecordPreview } from "./recordPreview.js";
import { EditorLanguageService } from "./service.js";

function preview(from: number): RecordPreview {
  return {
    from: 100,
    to: 140,
    truncated: false,
    pointer: { from, to: from + 4 },
  };
}

let view: EditorView | undefined;

afterEach(() => {
  view?.destroy();
  view = undefined;
});

function mount(
  options: Partial<Parameters<typeof recordPreviewHover>[0]> = {},
  doc = "0 HEAD\n1 FAMS @F1@\n0 TRLR",
) {
  const show = vi.fn();
  const hide = vi.fn();
  view = new EditorView({
    parent: document.createElement("div"),
    state: EditorState.create({
      doc,
      extensions: [
        recordPreviewHover({
          language: new EditorLanguageService(),
          show,
          hide,
          ...options,
        }),
      ],
    }),
  });
  return { view, show, hide };
}

describe("deciding what a pointing device just asked for", () => {
  it("stays quiet while nothing is pointed at", () => {
    expect(previewTransition(null, null)).toEqual({
      action: "keep",
      shown: null,
    });
  });

  it("shows the record when a pointer is reached", () => {
    expect(previewTransition(null, preview(7))).toEqual({
      action: "show",
      shown: 7,
    });
  });

  it("does not show the same pointer twice, so the preview does not flicker", () => {
    expect(previewTransition(7, preview(7))).toEqual({
      action: "keep",
      shown: 7,
    });
  });

  it("shows the next record when the device moves to another pointer", () => {
    expect(previewTransition(7, preview(20))).toEqual({
      action: "show",
      shown: 20,
    });
  });

  it("hides the record when the device leaves the pointer", () => {
    expect(previewTransition(7, null)).toEqual({ action: "hide", shown: null });
  });
});

describe("a host clearing the preview itself", () => {
  it("hides when the mark is dropped from outside the gesture", () => {
    const { view, hide } = mount();
    view.dispatch({ effects: setHoveredPointer.of({ from: 9, to: 13 }) });
    expect(hide).not.toHaveBeenCalled();

    clearRecordPreview(view);

    expect(hide).toHaveBeenCalledTimes(1);
    expect(hoveredPointer(view.state)).toBeNull();
  });

  it("does not hide while the mark only moves to another pointer", () => {
    const { view, hide } = mount();
    view.dispatch({ effects: setHoveredPointer.of({ from: 9, to: 13 }) });
    view.dispatch({ effects: setHoveredPointer.of({ from: 20, to: 24 }) });

    expect(hide).not.toHaveBeenCalled();
  });

  it("hides once, not on every quiet update after it", () => {
    const { view, hide } = mount();
    view.dispatch({ effects: setHoveredPointer.of({ from: 9, to: 13 }) });
    clearRecordPreview(view);
    view.dispatch({ changes: { from: 0, insert: "0 NOTE x\n" } });

    expect(hide).toHaveBeenCalledTimes(1);
  });
});

describe("the trigger a host chooses", () => {
  it("lets go of the preview when the modifier is not held", () => {
    const { view, hide } = mount();
    view.dispatch({ effects: setHoveredPointer.of({ from: 9, to: 13 }) });

    view.contentDOM.dispatchEvent(
      new MouseEvent("mousemove", { bubbles: true, clientX: 1, clientY: 1 }),
    );

    expect(hide).toHaveBeenCalledTimes(1);
  });

  it("asks the host, rather than deciding what a modifier means", () => {
    const trigger = vi.fn(() => false);
    const { view } = mount({ trigger });

    view.contentDOM.dispatchEvent(
      new MouseEvent("mousemove", { bubbles: true, clientX: 1, clientY: 1 }),
    );

    expect(trigger).toHaveBeenCalledTimes(1);
    expect(trigger.mock.calls[0]?.[0]).toBeInstanceOf(MouseEvent);
  });
});

describe("waiting before a preview opens", () => {
  // `@I1@` of `1 HUSB @I1@` starts at offset 52, and the record it names is
  // declared on the first line.
  const DOC = [
    "0 @I1@ INDI",
    "1 NAME Ada /Lovelace/",
    "0 @F1@ FAM",
    "1 HUSB @I1@",
  ].join("\n");
  const move = (view: EditorView) =>
    view.contentDOM.dispatchEvent(
      new MouseEvent("mousemove", { bubbles: true, clientX: 1, clientY: 1 }),
    );

  afterEach(() => {
    vi.useRealTimers();
  });

  it("says nothing until the pointer has rested for as long as asked", () => {
    vi.useFakeTimers();
    const { view, show } = mount({ trigger: () => true, delay: 300 }, DOC);
    vi.spyOn(view, "posAtCoords").mockReturnValue(53);

    move(view);
    expect(show).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(show).toHaveBeenCalledTimes(1);
  });

  it("drops a wait the pointer left before it was up", () => {
    vi.useFakeTimers();
    const { view, show } = mount({ trigger: () => true, delay: 300 }, DOC);
    vi.spyOn(view, "posAtCoords").mockReturnValue(53);

    move(view);
    view.contentDOM.dispatchEvent(
      new MouseEvent("mouseleave", { bubbles: true }),
    );
    vi.advanceTimersByTime(300);

    expect(show).not.toHaveBeenCalled();
  });

  it("closes an open preview without waiting", () => {
    vi.useFakeTimers();
    const { view, hide } = mount({ trigger: () => true, delay: 300 }, DOC);
    view.dispatch({ effects: setHoveredPointer.of({ from: 52, to: 56 }) });
    vi.spyOn(view, "posAtCoords").mockReturnValue(null);

    move(view);

    expect(hide).toHaveBeenCalledTimes(1);
  });
});
