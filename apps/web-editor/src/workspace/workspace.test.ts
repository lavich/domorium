import { describe, expect, it } from "vitest";

import type { DocumentReport } from "../editor/types";
import {
  activeFile,
  emptyWorkspace,
  fileKindOf,
  isOpen,
  unsavedFiles,
  workspaceReducer,
  type Workspace,
  type WorkspaceAction,
} from "./workspace";

const after = (actions: WorkspaceAction[], from: Workspace = emptyWorkspace) =>
  actions.reduce(workspaceReducer, from);

const granted = (): Workspace =>
  after([{ type: "workspace-opened", name: "Webb Family", writable: true }]);

const opened = (path: string, text: string | null = "0 HEAD\n") =>
  ({ type: "file-opened", path, kind: fileKindOf(path), text }) as const;

describe("which view a file calls for", () => {
  it("reads it from the name, which is all there is before the file is read", () => {
    expect(fileKindOf("tree.ged")).toBe("gedcom");
    expect(fileKindOf("media/TREE.GEDCOM")).toBe("gedcom");
    expect(fileKindOf("notes.md")).toBe("markdown");
    expect(fileKindOf("a/b/portrait.JPG")).toBe("image");
    expect(fileKindOf("receipt.pdf")).toBe("unsupported");
    expect(fileKindOf("LICENSE")).toBe("unsupported");
  });
});

describe("a workspace of open files", () => {
  it("names itself and starts with nothing open", () => {
    const state = granted();

    expect(state.name).toBe("Webb Family");
    expect(state.writable).toBe(true);
    expect(state.files).toEqual([]);
    expect(activeFile(state)).toBeNull();
  });

  it("opens a file in a tab of its own and brings it forward", () => {
    const state = after(
      [opened("tree.ged"), opened("notes.md", "# Note")],
      granted(),
    );

    expect(state.files.map((file) => file.path)).toEqual([
      "tree.ged",
      "notes.md",
    ]);
    expect(activeFile(state)?.kind).toBe("markdown");
  });

  // The reader clicking a file they already have open should not reread it.
  it("brings an already-open file forward without opening it twice", () => {
    const twice = after(
      [opened("tree.ged"), opened("notes.md", "# Note"), opened("tree.ged")],
      granted(),
    );

    expect(twice.files).toHaveLength(2);
    expect(twice.activePath).toBe("tree.ged");
    expect(twice.files[0].editorKey).toBe(
      after([opened("tree.ged")], granted()).files[0].editorKey,
    );
  });

  it("refuses a kind it has no view for, and opens no tab", () => {
    const state = after([opened("receipt.pdf", null)], granted());

    expect(state.files).toEqual([]);
    expect(state.notice).toBe("receipt.pdf is not a kind this editor can show");
  });

  it("closes a tab and falls back to the one beside it", () => {
    const state = after(
      [
        opened("tree.ged"),
        opened("notes.md", "# Note"),
        { type: "file-closed", path: "notes.md" },
      ],
      granted(),
    );

    expect(state.files.map((file) => file.path)).toEqual(["tree.ged"]);
    expect(state.activePath).toBe("tree.ged");
  });

  it("closes the last tab and leaves nothing active", () => {
    const state = after(
      [opened("tree.ged"), { type: "file-closed", path: "tree.ged" }],
      granted(),
    );

    expect(state.files).toEqual([]);
    expect(state.activePath).toBeNull();
    expect(isOpen(state, "tree.ged")).toBe(false);
  });

  it("opening another workspace forgets what was open", () => {
    const state = after(
      [
        opened("tree.ged"),
        { type: "workspace-opened", name: "Other", writable: false },
      ],
      granted(),
    );

    expect(state.files).toEqual([]);
    expect(state.name).toBe("Other");
    expect(state.writable).toBe(false);
  });
});

describe("what counts as unsaved", () => {
  it("marks an edited GEDCOM document and clears it on save", () => {
    const edited = after(
      [opened("tree.ged"), { type: "edited", path: "tree.ged" }],
      granted(),
    );
    expect(unsavedFiles(edited).map((file) => file.path)).toEqual(["tree.ged"]);

    const saved = workspaceReducer(edited, { type: "saved", path: "tree.ged" });
    expect(unsavedFiles(saved)).toEqual([]);
  });

  // A preview has nothing to save, so it must never claim to.
  it("never marks a preview, however it is prodded", () => {
    const state = after(
      [
        opened("notes.md", "# Note"),
        opened("media/portrait.jpg", null),
        { type: "edited", path: "notes.md" },
        { type: "edited", path: "media/portrait.jpg" },
      ],
      granted(),
    );

    expect(unsavedFiles(state)).toEqual([]);
    expect(state.files.every((file) => !file.modified)).toBe(true);
  });

  // The editor is one document at a time, so the tab being left has to carry its
  // text or it comes back off the disk.
  it("keeps the text of a tab without unmarking it or remounting it", () => {
    const state = after(
      [
        opened("tree.ged", "0 HEAD\n"),
        { type: "edited", path: "tree.ged" },
        { type: "text-kept", path: "tree.ged", text: "0 HEAD\n0 NOTE typed\n" },
      ],
      granted(),
    );
    const tree = state.files[0];

    expect(tree.initialText).toBe("0 HEAD\n0 NOTE typed\n");
    expect(tree.modified).toBe(true);
    expect(tree.editorKey).toBe(0);
  });

  it("keeps no text on a preview, which the editor never held", () => {
    const state = after([opened("notes.md", "# Anna\n")], granted());

    expect(
      workspaceReducer(state, {
        type: "text-kept",
        path: "notes.md",
        text: "# Someone else",
      }),
    ).toBe(state);
  });

  it("leaves the state alone when nothing changes", () => {
    const state = after([opened("tree.ged")], granted());

    expect(workspaceReducer(state, { type: "saved", path: "tree.ged" })).toBe(
      state,
    );
    expect(
      workspaceReducer(state, { type: "file-activated", path: "absent.ged" }),
    ).toBe(state);
    expect(
      workspaceReducer(state, { type: "file-closed", path: "absent.ged" }),
    ).toBe(state);
    expect(
      workspaceReducer(state, {
        type: "text-kept",
        path: "tree.ged",
        text: "0 HEAD\n",
      }),
    ).toBe(state);
  });
});

describe("what a surface reported about a document", () => {
  const findings = (count: number): DocumentReport => ({
    kind: "gedcom",
    status: { line: 0, character: 0, resolution: undefined },
    diagnostics: Array.from({ length: count }, () => ({
      severity: "error" as const,
      code: "VAL001",
      message: "unknown tag",
      from: 0,
      to: 4,
      line: 0,
      character: 0,
    })),
  });

  const report = (path: string, count: number) =>
    ({ type: "reported", path, report: findings(count) }) as const;

  it("keeps it on the file it names", () => {
    const state = after([opened("tree.ged"), report("tree.ged", 3)], granted());

    expect(activeFile(state)?.report).toEqual(findings(3));
  });

  // The editor is destroyed and recreated on a tab switch, so a lint finishing
  // afterwards would otherwise be read as the new document's.
  it("gives each open file its own, and lets neither speak for the other", () => {
    const state = after(
      [
        opened("tree.ged"),
        opened("other.ged"),
        report("tree.ged", 3),
        report("other.ged", 1),
      ],
      granted(),
    );

    expect(state.files[0].report).toEqual(findings(3));
    expect(state.files[1].report).toEqual(findings(1));
  });

  it("discards one that names no open file", () => {
    const state = after([opened("tree.ged")], granted());

    expect(workspaceReducer(state, report("closed.ged", 3))).toBe(state);
  });

  it("forgets it with the file, and reopening starts with none", () => {
    const state = after(
      [
        opened("tree.ged"),
        report("tree.ged", 3),
        { type: "file-closed", path: "tree.ged" },
        opened("tree.ged"),
      ],
      granted(),
    );

    expect(state.files[0].report).toBeNull();
  });
});
