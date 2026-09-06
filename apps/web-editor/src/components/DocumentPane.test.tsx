// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DocumentPane } from "./DocumentPane";
import { InApp, testApp } from "@/cordis/testing";
import type { AppContext } from "@/cordis/app";
import type {
  DocumentReport,
  WebDiagnostic,
  WebEditorStatus,
} from "@/editor/types";
import { fileKindOf, type WorkspaceAction } from "@/workspace/workspace";

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

const open = (path: string) =>
  ({
    type: "file-opened",
    path,
    kind: fileKindOf(path),
    text: fileKindOf(path) === "image" ? null : "0 HEAD\n",
  }) as const;

const paneWith = async (...actions: WorkspaceAction[]): Promise<AppContext> => {
  const app = await testApp(
    { type: "workspace-opened", name: "Webb Family", writable: true },
    ...actions,
  );
  render(
    <InApp app={app}>
      <DocumentPane theme="light" wideEnoughForPanels onFollowLink={vi.fn()} />
    </InApp>,
  );
  return app;
};

const problems = () =>
  screen.queryByRole("complementary", { name: /GEDCOM problems/i });

describe("the pane that holds one document", () => {
  it("stands the problems panel beside a GEDCOM document, listing its findings", async () => {
    await paneWith(open("tree.ged"), {
      type: "reported",
      path: "tree.ged",
      report: found("unknown tag"),
    });

    expect(problems()).not.toBeNull();
    expect(screen.getByText(/unknown tag/)).toBeTruthy();
  });

  // A picture in front was shown beside another file's findings.
  it("takes the panel away when the tab in front is not a GEDCOM file", async () => {
    await paneWith(
      open("tree.ged"),
      { type: "reported", path: "tree.ged", report: found("unknown tag") },
      open("media/portrait.jpg"),
    );

    expect(problems()).toBeNull();
    expect(screen.queryByText(/unknown tag/)).toBeNull();
  });

  it("shows one GEDCOM document's findings and never its neighbour's", async () => {
    await paneWith(
      open("tree.ged"),
      { type: "reported", path: "tree.ged", report: found("unknown tag") },
      open("other.ged"),
      { type: "reported", path: "other.ged", report: found("date not read") },
    );

    expect(screen.getByText(/date not read/)).toBeTruthy();
    expect(screen.queryByText(/unknown tag/)).toBeNull();
  });

  it("reports nothing for a GEDCOM document that has not been checked yet", async () => {
    await paneWith(open("tree.ged"));

    expect(problems()).not.toBeNull();
    expect(screen.getByText("Nothing to report")).toBeTruthy();
  });

  // The cursor moving and the document being checked are two events, and the file
  // carries one report: the second must not blank what the first said.
  it("carries where the cursor is and what was found as one report", async () => {
    const app = await paneWith(open("tree.ged"));
    const user = userEvent.setup();

    await user.click(screen.getByText("moved"));
    await user.click(screen.getByText("checked"));

    expect(app.ctx.workspace.active?.report).toEqual({
      kind: "gedcom",
      status: { line: 4, character: 2, resolution: undefined },
      diagnostics: [finding("unknown tag")],
    });
  });

  // Two notes in a row are the same component in the same place: without a key
  // the second never reports, and the bar goes on describing the first.
  it("has each note report for itself", async () => {
    const app = await paneWith(open("first.md"), open("second.md"));
    await act(async () => {
      app.ctx.workspace.dispatch({ type: "file-activated", path: "first.md" });
    });
    await act(async () => {
      app.ctx.workspace.dispatch({ type: "file-activated", path: "second.md" });
    });

    expect(
      app.ctx.workspace.snapshot.files.map((file) => [
        file.path,
        file.report !== null,
      ]),
    ).toEqual([
      ["first.md", true],
      ["second.md", true],
    ]);
  });

  it("leaves the panel out when the reader has closed it", async () => {
    const app = await paneWith(open("tree.ged"), {
      type: "reported",
      path: "tree.ged",
      report: found("unknown tag"),
    });
    await act(async () => {
      app.ctx.rail.toggle("problems");
    });

    expect(problems()).toBeNull();
  });
});
