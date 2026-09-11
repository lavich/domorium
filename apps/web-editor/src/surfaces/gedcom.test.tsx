// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Context } from "cordis";
import { forwardRef, useImperativeHandle } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider } from "@/components/ThemeProvider";
import { CordisProvider } from "@/cordis/react";
import { CommandService } from "@/services/commands";
import { RailService } from "@/services/rail";
import { SurfaceService, type DocumentSurface } from "@/services/surfaces";
import { WorkspaceService } from "@/services/workspace";
import type {
  GedcomEditorHandle,
  WebDiagnostic,
  WebEditorStatus,
} from "@/editor/types";
import { gedcomSurface } from "./gedcom";

const searched: string[] = [];

vi.mock("@/editor/GedcomEditor", () => ({
  GedcomEditor: forwardRef<
    GedcomEditorHandle,
    {
      initialText: string;
      onStatusChange(status: WebEditorStatus): void;
      onDiagnosticsChange(diagnostics: WebDiagnostic[]): void;
    }
  >(function GedcomEditor(
    { initialText, onStatusChange, onDiagnosticsChange },
    ref,
  ) {
    useImperativeHandle(ref, () => ({
      getText: () => initialText,
      destroy: () => {},
      focusDiagnostic: () => {},
      setTheme: () => {},
      toggleSearch: () => searched.push(initialText),
    }));
    return (
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
    );
  }),
}));

// The theme follows the system preference, which jsdom does not report.
beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  searched.length = 0;
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

async function mounted(): Promise<{
  ctx: Context;
  surface: DocumentSurface<"gedcom">;
}> {
  const ctx = new Context();
  new WorkspaceService(ctx);
  new CommandService(ctx);
  new RailService(ctx);
  new SurfaceService(ctx);
  await ctx.plugin(gedcomSurface);
  return {
    ctx,
    surface: ctx.surfaces.get("gedcom") as DocumentSurface<"gedcom">,
  };
}

const checked = (line: number, issues: number) =>
  ({
    kind: "gedcom",
    status: { line, character: 2, resolution: undefined },
    diagnostics: Array.from({ length: issues }, () => finding("unknown tag")),
  }) as const;

/** One tab of a workspace, as the reducer would have built it. */
const tab = (path: string, editorKey = 0) => ({
  path,
  name: path.slice(path.lastIndexOf("/") + 1),
  kind: "gedcom" as const,
  editable: true,
  initialText: "0 HEAD\n",
  modified: false,
  report: null,
  editorKey,
});

const showing = async (
  ctx: Context,
  surface: DocumentSurface<"gedcom">,
  path: string,
  editorKey = 0,
) => {
  const file = tab(path, editorKey);
  await act(async () => {
    ctx.workspace.dispatch({
      type: "file-opened",
      path: file.path,
      kind: "gedcom",
      editable: true,
      text: file.initialText,
    });
  });
  render(
    <CordisProvider ctx={ctx}>
      <ThemeProvider>{surface.render(file)}</ThemeProvider>
    </CordisProvider>,
  );
  return file;
};

describe("the surface that edits a GEDCOM document", () => {
  it("claims the GEDCOM extensions and nothing else", async () => {
    const { surface } = await mounted();

    expect(surface.claims("tree.ged")).toBe(true);
    expect(surface.claims("media/TREE.GEDCOM")).toBe(true);
    expect(surface.claims("notes.md")).toBe(false);
    expect(surface.claims("ged.png")).toBe(false);
  });

  it("is the one surface whose document can be written", async () => {
    const { surface } = await mounted();

    expect(surface.editable).toBe(true);
    expect(surface.reads).toBe("text");
  });

  it("states the version, the position and the issue count", async () => {
    const { surface } = await mounted();
    const facts = surface.facts?.(checked(4, 3)) ?? [];

    expect(facts).toHaveLength(4);
    expect(facts.slice(1)).toEqual(["not stated", "Ln 5, Col 3", "3 issues"]);
  });

  it("counts one issue in the singular", async () => {
    const { surface } = await mounted();

    expect(surface.facts?.(checked(0, 1))?.at(-1)).toBe("1 issue");
  });

  // The cursor moving and the document being checked are two events, and the file
  // carries one report: the second must not blank what the first said.
  it("carries where the cursor is and what was found as one report", async () => {
    const { ctx, surface } = await mounted();
    await showing(ctx, surface, "tree.ged");
    const user = userEvent.setup();

    await user.click(screen.getByText("moved"));
    await user.click(screen.getByText("checked"));

    expect(ctx.workspace.active?.report).toEqual({
      kind: "gedcom",
      status: { line: 4, character: 2, resolution: undefined },
      diagnostics: [finding("unknown tag")],
    });
  });

  // A reopened file gets a new editor, which has found nothing yet.
  it("does not let a new editor inherit what its predecessor found", async () => {
    const { ctx, surface } = await mounted();
    await showing(ctx, surface, "tree.ged");
    const user = userEvent.setup();
    await user.click(screen.getByText("checked"));
    cleanup();

    await showing(ctx, surface, "tree.ged", 1);
    await user.click(screen.getByText("moved"));

    expect(ctx.workspace.active?.report).toEqual({
      kind: "gedcom",
      status: { line: 4, character: 2, resolution: undefined },
      diagnostics: [],
    });
  });

  it("counts the findings of the document in front on its rail item", async () => {
    const { ctx, surface } = await mounted();
    const problems = ctx.rail.snapshot.items.find(
      (item) => item.id === "problems",
    );
    expect(problems?.badge?.()).toBeNull();

    await showing(ctx, surface, "tree.ged");
    expect(problems?.badge?.()).toBe(0);

    await act(async () => {
      ctx.workspace.dispatch({
        type: "reported",
        path: "tree.ged",
        report: checked(0, 2),
      });
    });
    expect(problems?.badge?.()).toBe(2);
    expect(problems?.label(2)).toBe("2 problems");
    expect(problems?.enabled?.()).toBe(true);
  });

  // A file the editor does not check has no findings to count, which is not none.
  it("takes its rail item away when the file in front is not a GEDCOM one", async () => {
    const { ctx } = await mounted();
    const problems = ctx.rail.snapshot.items.find(
      (item) => item.id === "problems",
    );

    await act(async () => {
      ctx.workspace.dispatch({
        type: "file-opened",
        path: "notes.md",
        kind: "markdown",
        editable: false,
        text: "# Note",
      });
    });

    expect(problems?.badge?.()).toBeNull();
    expect(problems?.enabled?.()).toBe(false);
    expect(problems?.label(null)).toBe("Problems, for a GEDCOM file");
  });

  it("offers to search only while a document is mounted, and searches it", async () => {
    const { ctx, surface } = await mounted();
    const search = ctx.rail.snapshot.items.find((item) => item.id === "search");
    expect(search?.enabled?.()).toBe(false);

    await showing(ctx, surface, "tree.ged");
    expect(search?.enabled?.()).toBe(true);

    search?.activate?.();
    expect(searched).toEqual(["0 HEAD\n"]);
  });

  // Saving asks the shell for the text, and the shell asks whatever is mounted.
  it("hands the mounted document to the shell for saving", async () => {
    const { ctx, surface } = await mounted();
    expect(ctx.surfaces.text()).toBeUndefined();

    await showing(ctx, surface, "tree.ged");
    expect(ctx.surfaces.text()).toBe("0 HEAD\n");
  });
});
