// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { createRef } from "react";
import { beforeEach, expect, it, vi } from "vitest";

import { GedcomEditor } from "./GedcomEditor";
import { createGedcomEditor } from "./createGedcomEditor";
import type { GedcomEditorHandle } from "./types";

vi.mock("./createGedcomEditor");

const firstHandle: GedcomEditorHandle = {
  getText: vi.fn(() => ""),
  destroy: vi.fn(),
  focusDiagnostic: vi.fn(),
  setTheme: vi.fn(),
  openSearch: vi.fn(),
};

const secondHandle: GedcomEditorHandle = {
  getText: vi.fn(() => ""),
  destroy: vi.fn(),
  focusDiagnostic: vi.fn(),
  setTheme: vi.fn(),
  openSearch: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createGedcomEditor)
    .mockReturnValueOnce(firstHandle)
    .mockReturnValue(secondHandle);
});

it("creates one editor and destroys it on unmount", () => {
  const ref = createRef<GedcomEditorHandle>();
  const view = render(
    <GedcomEditor
      ref={ref}
      editorKey={1}
      initialText="0 HEAD"
      theme="dark"
      onChange={vi.fn()}
      onDiagnosticsChange={vi.fn()}
      onStatusChange={vi.fn()}
      onFollowLink={vi.fn()}
    />,
  );

  expect(createGedcomEditor).toHaveBeenCalledOnce();
  view.unmount();
  expect(firstHandle.destroy).toHaveBeenCalledOnce();
});

it("updates the theme without replacing the editor", () => {
  const view = render(
    <GedcomEditor
      editorKey={1}
      initialText="0 HEAD"
      theme="light"
      onChange={vi.fn()}
      onDiagnosticsChange={vi.fn()}
      onStatusChange={vi.fn()}
      onFollowLink={vi.fn()}
    />,
  );

  view.rerender(
    <GedcomEditor
      editorKey={1}
      initialText="0 HEAD"
      theme="dark"
      onChange={vi.fn()}
      onDiagnosticsChange={vi.fn()}
      onStatusChange={vi.fn()}
      onFollowLink={vi.fn()}
    />,
  );

  expect(createGedcomEditor).toHaveBeenCalledOnce();
  expect(firstHandle.setTheme).toHaveBeenLastCalledWith("dark");
});

it("replaces the editor when the document key changes", () => {
  const view = render(
    <GedcomEditor
      editorKey={1}
      initialText="demo"
      theme="light"
      onChange={vi.fn()}
      onDiagnosticsChange={vi.fn()}
      onStatusChange={vi.fn()}
      onFollowLink={vi.fn()}
    />,
  );

  view.rerender(
    <GedcomEditor
      editorKey={2}
      initialText="family"
      theme="light"
      onChange={vi.fn()}
      onDiagnosticsChange={vi.fn()}
      onStatusChange={vi.fn()}
      onFollowLink={vi.fn()}
    />,
  );

  expect(firstHandle.destroy).toHaveBeenCalledOnce();
  expect(createGedcomEditor).toHaveBeenCalledTimes(2);
  expect(vi.mocked(createGedcomEditor).mock.calls[1][0].initialText).toBe(
    "family",
  );
});
