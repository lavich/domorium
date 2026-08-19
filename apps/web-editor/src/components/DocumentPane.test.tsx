// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DocumentPane } from "./DocumentPane";
import type {
  DocumentReport,
  GedcomEditorHandle,
  WebDiagnostic,
  WebEditorStatus,
} from "@/editor/types";
import {
  emptyWorkspace,
  fileKindOf,
  workspaceReducer,
  type Workspace,
  type WorkspaceAction,
} from "@/workspace/workspace";

vi.mock("@/editor/GedcomEditor", () => ({
  GedcomEditor: ({
    onStatusChange,
    onDiagnosticsChange,
  }: {
    onStatusChange(status: WebEditorStatus): void;
    onDiagnosticsChange(diagnostics: WebDiagnostic[]): void;
  }) => (
    <div aria-label="GEDCOM editor">
      <button
        onClick={() =>
          onStatusChange({ line: 4, character: 2, resolution: undefined })
        }
      >
        moved
      </button>
      <button onClick={() => onDiagnosticsChange([finding("unknown tag")])}>
        checked
      </button>
    </div>
  ),
}));

// The resizable group measures itself on mount, which jsdom cannot do.
beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const finding = (message: string): WebDiagnostic => ({
  severity: "error",
  code: "VAL001",
  message,
  from: 0,
  to: 4,
  line: 0,
  character: 0,
});

const found = (message: string): DocumentReport => ({
  kind: "gedcom",
  status: { line: 0, character: 0, resolution: undefined },
  diagnostics: [finding(message)],
});

const workspaceOf = (...actions: WorkspaceAction[]): Workspace =>
  actions.reduce(
    workspaceReducer,
    workspaceReducer(emptyWorkspace, {
      type: "workspace-opened",
      name: "Webb Family",
      writable: true,
    }),
  );

const open = (path: string) =>
  ({
    type: "file-opened",
    path,
    kind: fileKindOf(path),
    text: fileKindOf(path) === "image" ? null : "0 HEAD\n",
  }) as const;

const paneWith = (
  workspace: Workspace,
  problemsOpen = true,
  onReport: (path: string, report: DocumentReport) => void = vi.fn(),
) => (
  <DocumentPane
    workspace={workspace}
    theme="light"
    editorRef={createRef<GedcomEditorHandle>()}
    wideEnoughForPanels
    problemsOpen={problemsOpen}
    onChange={vi.fn()}
    onReport={onReport}
    onFollowLink={vi.fn()}
    onActivate={vi.fn()}
    onClose={vi.fn()}
    readBytes={() => Promise.resolve(new Blob())}
  />
);

const problems = () =>
  screen.queryByRole("complementary", { name: /GEDCOM problems/i });

describe("the pane that holds one document", () => {
  it("stands the problems panel beside a GEDCOM document, listing its findings", () => {
    render(
      paneWith(
        workspaceOf(open("tree.ged"), {
          type: "reported",
          path: "tree.ged",
          report: found("unknown tag"),
        }),
      ),
    );

    expect(problems()).not.toBeNull();
    expect(screen.getByText(/unknown tag/)).toBeTruthy();
  });

  // A picture in front used to be shown beside another file's findings.
  it("takes the panel away when the tab in front is not a GEDCOM file", () => {
    render(
      paneWith(
        workspaceOf(
          open("tree.ged"),
          { type: "reported", path: "tree.ged", report: found("unknown tag") },
          open("media/portrait.jpg"),
        ),
      ),
    );

    expect(problems()).toBeNull();
    expect(screen.queryByText(/unknown tag/)).toBeNull();
  });

  it("shows one GEDCOM document's findings and never its neighbour's", () => {
    const both = workspaceOf(
      open("tree.ged"),
      { type: "reported", path: "tree.ged", report: found("unknown tag") },
      open("other.ged"),
      { type: "reported", path: "other.ged", report: found("date not read") },
    );
    render(paneWith(both));

    expect(screen.getByText(/date not read/)).toBeTruthy();
    expect(screen.queryByText(/unknown tag/)).toBeNull();
  });

  it("reports nothing for a GEDCOM document that has not been checked yet", () => {
    render(paneWith(workspaceOf(open("tree.ged"))));

    expect(problems()).not.toBeNull();
    expect(screen.getByText("Nothing to report")).toBeTruthy();
  });

  // The cursor moving and the document being checked are two events, and the file
  // carries one report: the second must not blank what the first said.
  it("carries where the cursor is and what was found as one report", async () => {
    const said: { path: string; report: DocumentReport }[] = [];
    render(
      paneWith(workspaceOf(open("tree.ged")), true, (path, report) =>
        said.push({ path, report }),
      ),
    );
    const user = userEvent.setup();

    await user.click(screen.getByText("moved"));
    await user.click(screen.getByText("checked"));

    expect(said.at(-1)).toEqual({
      path: "tree.ged",
      report: {
        kind: "gedcom",
        status: { line: 4, character: 2, resolution: undefined },
        diagnostics: [finding("unknown tag")],
      },
    });
  });

  // Two notes in a row are the same component in the same place: without a key
  // the second never reports, and the bar goes on describing the first.
  it("has each note report for itself", async () => {
    const said: string[] = [];
    const notes = workspaceOf(open("first.md"), open("second.md"));
    const view = render(
      paneWith({ ...notes, activePath: "first.md" }, true, (path) =>
        said.push(path),
      ),
    );
    view.rerender(paneWith(notes, true, (path) => said.push(path)));

    expect(said).toEqual(["first.md", "second.md"]);
  });

  it("leaves the panel out when the reader has closed it", () => {
    render(
      paneWith(
        workspaceOf(open("tree.ged"), {
          type: "reported",
          path: "tree.ged",
          report: found("unknown tag"),
        }),
        false,
      ),
    );

    expect(problems()).toBeNull();
  });
});
