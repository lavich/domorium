// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EditorTabs } from "./EditorTabs";
import {
  emptyWorkspace,
  fileKindOf,
  workspaceReducer,
  type Workspace,
} from "@/workspace/workspace";

afterEach(cleanup);

const workspaceWith = (paths: string[], edited: string[] = []): Workspace => {
  let state = workspaceReducer(emptyWorkspace, {
    type: "workspace-opened",
    name: "Webb Family",
    writable: true,
  });
  for (const path of paths) {
    state = workspaceReducer(state, {
      type: "file-opened",
      path,
      kind: fileKindOf(path),
      text: fileKindOf(path) === "image" ? null : "content",
    });
  }
  for (const path of edited) {
    state = workspaceReducer(state, { type: "edited", path });
  }
  return state;
};

const tabsFor = (state: Workspace, handlers = {}) =>
  render(
    <EditorTabs
      files={state.files}
      activePath={state.activePath}
      onActivate={vi.fn()}
      onClose={vi.fn()}
      {...handlers}
    />,
  );

describe("the tab bar", () => {
  it("shows one tab per open file, naming each", () => {
    tabsFor(workspaceWith(["tree.ged", "notes.md", "media/portrait.jpg"]));

    expect(screen.getByRole("tab", { name: /tree\.ged/ })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /notes\.md/ })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /portrait\.jpg/ })).toBeTruthy();
  });

  // A preview holds no document, so it must never wear the unsaved dot.
  it("marks an edited GEDCOM tab and never a preview", () => {
    tabsFor(
      workspaceWith(
        ["tree.ged", "notes.md"],
        ["tree.ged", "notes.md"], // the note is prodded too, and must not take it
      ),
    );

    const marks = screen.queryAllByLabelText("Unsaved changes");
    expect(marks).toHaveLength(1);
    expect(
      screen.getByRole("tab", { name: /tree\.ged/ }).textContent,
    ).toContain("tree.ged");
  });

  it("asks for a file when its tab is chosen", async () => {
    const onActivate = vi.fn();
    tabsFor(workspaceWith(["tree.ged", "notes.md"]), { onActivate });

    await userEvent.click(screen.getByRole("tab", { name: /tree\.ged/ }));

    expect(onActivate).toHaveBeenCalledWith("tree.ged");
  });

  // Closing the tab beside the one in front should leave the reader where they
  // were, so the close button must not also select the tab it sits in.
  it("closes a tab without selecting it", async () => {
    const onActivate = vi.fn();
    const onClose = vi.fn();
    tabsFor(workspaceWith(["tree.ged", "notes.md"]), { onActivate, onClose });

    await userEvent.click(screen.getByLabelText("Close tree.ged"));

    expect(onClose).toHaveBeenCalledWith("tree.ged");
    expect(onActivate).not.toHaveBeenCalled();
  });

  it("shows an empty strip when nothing is open", () => {
    tabsFor(emptyWorkspace);

    expect(screen.queryAllByRole("tab")).toHaveLength(0);
  });
});
