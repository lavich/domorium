// @vitest-environment jsdom
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createGedcomEditor } from "./createGedcomEditor";
import type { GedcomEditorHandle } from "./types";

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

let handle: GedcomEditorHandle | undefined;

afterEach(() => {
  handle?.destroy();
  handle = undefined;
  vi.useRealTimers();
});

const editor = (overrides: Partial<Parameters<typeof createGedcomEditor>[0]>) => {
  const parent = document.createElement("div");
  document.body.append(parent);
  handle = createGedcomEditor({
    parent,
    initialText: text,
    theme: "light",
    onChange: () => {},
    onDiagnosticsChange: () => {},
    ...overrides,
  });
  return parent;
};

describe("createGedcomEditor", () => {
  // The editor's own plugins defer their work, but the host listener undid it:
  // it reparsed the whole document to refresh the problems panel on every
  // keystroke, which is the single most expensive thing on that path.
  it("does not refresh the problems panel on every keystroke", () => {
    vi.useFakeTimers();
    const onDiagnosticsChange = vi.fn();
    const parent = editor({ onDiagnosticsChange });
    onDiagnosticsChange.mockClear();

    const view = EditorView.findFromDOM(parent);
    expect(view).not.toBeNull();

    view!.dispatch({ changes: { from: 0, insert: "0 NOTE typed\n" } });
    expect(onDiagnosticsChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(onDiagnosticsChange).toHaveBeenCalledOnce();
  });
});
