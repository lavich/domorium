// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import { Context, type Fiber } from "cordis";
import { ListChecksIcon } from "lucide-react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DocumentPane } from "./DocumentPane";
import { CordisProvider } from "@/cordis/react";
import { CommandService } from "@/services/commands";
import { RailService } from "@/services/rail";
import { SurfaceService } from "@/services/surfaces";
import { WorkspaceService } from "@/services/workspace";
import type { WorkspaceAction } from "@/workspace/workspace";

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

/**
 * The pane knows nothing of GEDCOM: a surface that says what it was handed is
 * enough to see whether the right one was asked, and with which file.
 */
const mounts: string[] = [];
/** Held so a test can take the surface away again. */
let showingNotes: Fiber;

function Recorder({ label }: { label: string }) {
  mounts.push(label);
  return <div>showing {label}</div>;
}

async function paneWith(...actions: WorkspaceAction[]): Promise<Context> {
  mounts.length = 0;
  const ctx = new Context();
  new WorkspaceService(ctx);
  new CommandService(ctx);
  new RailService(ctx);
  new SurfaceService(ctx);

  showingNotes = ctx.plugin((inner: Context) => {
    inner.surfaces.register({
      id: "markdown",
      claims: (path) => path.endsWith(".md"),
      reads: "text",
      render: (file) => <Recorder label={`${file.name}@${file.editorKey}`} />,
    });
  });
  await showingNotes;
  ctx.commands.register("workspace.activateTab", (path) =>
    ctx.workspace.dispatch({ type: "file-activated", path }),
  );
  ctx.commands.register("workspace.closeTab", (path) =>
    ctx.workspace.dispatch({ type: "file-closed", path }),
  );

  ctx.workspace.dispatch({
    type: "workspace-opened",
    name: "Webb Family",
    writable: true,
  });
  for (const action of actions) {
    ctx.workspace.dispatch(action);
  }

  render(
    <CordisProvider ctx={ctx}>
      <DocumentPane wideEnoughForPanels />
    </CordisProvider>,
  );
  return ctx;
}

const open = (path: string) =>
  ({
    type: "file-opened",
    path,
    kind: "markdown",
    editable: false,
    text: "# Note",
  }) as const;

describe("the pane that holds one document", () => {
  it("shows the surface that claims the file in front", async () => {
    await paneWith(open("notes.md"));

    expect(screen.getByText("showing notes.md@0")).toBeTruthy();
  });

  it("says a file cannot be shown once its surface is gone", async () => {
    await paneWith(open("notes.md"));

    await act(() => showingNotes.dispose());

    expect(screen.getByText("notes.md cannot be shown")).toBeTruthy();
  });

  it("says nothing is open before a file is chosen", async () => {
    await paneWith();

    expect(screen.getByText("Nothing open")).toBeTruthy();
  });

  // Two files in a row are the same component in the same place: without a key
  // the second never mounts, and the surface goes on showing the first.
  it("mounts a surface of its own for each file", async () => {
    const ctx = await paneWith(open("first.md"), open("second.md"));
    await act(async () => {
      ctx.workspace.dispatch({ type: "file-activated", path: "first.md" });
    });

    expect(mounts).toEqual(["second.md@1", "first.md@0"]);
  });

  // A reopened file is a new editor on the same path, and it has to be reread.
  it("remounts a file that was closed and opened again", async () => {
    const ctx = await paneWith(open("notes.md"));
    await act(async () => {
      ctx.workspace.dispatch({ type: "file-closed", path: "notes.md" });
      ctx.workspace.dispatch(open("notes.md"));
    });

    expect(mounts).toEqual(["notes.md@0", "notes.md@1"]);
  });

  it("stands an open rail panel beside the document", async () => {
    const ctx = await paneWith(open("notes.md"));
    await act(async () => {
      ctx.rail.item({
        id: "problems",
        icon: ListChecksIcon,
        slot: "aux",
        label: () => "Problems",
        render: () => <aside aria-label="beside">panel</aside>,
      });
    });

    expect(screen.getByLabelText("beside")).toBeTruthy();
  });

  it("leaves out a panel its own item says is not available", async () => {
    const ctx = await paneWith(open("notes.md"));
    await act(async () => {
      ctx.rail.item({
        id: "problems",
        icon: ListChecksIcon,
        slot: "aux",
        label: () => "Problems",
        enabled: () => false,
        render: () => <aside aria-label="beside">panel</aside>,
      });
    });

    expect(screen.queryByLabelText("beside")).toBeNull();
  });
});
