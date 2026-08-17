// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import { ExplorerPanel, type ExplorerPanelProps } from "./ExplorerPanel";
import { createMemoryGateway } from "@/workspace/memoryGateway";
import { treeRows } from "@/workspace/tree";

afterEach(cleanup);

const rowsOf = (expanded: string[] = []) =>
  treeRows(
    createMemoryGateway({
      "tree.ged": "0 HEAD\n",
      "notes.md": "# Note\n",
      "receipt.pdf": "%PDF",
      "media/portrait.jpg": "bytes",
      '<img src=x onerror="alert(1)">.ged': "0 HEAD\n",
    }),
    new Set(expanded),
  );

const panel = (props: Partial<ExplorerPanelProps> = {}) =>
  render(
    <TooltipProvider>
      <ExplorerPanel
        workspaceName="Webb Family"
        rows={[]}
        activePath={null}
        unavailableReason={null}
        notice={null}
        onOpenFolder={vi.fn()}
        onOpenFile={vi.fn()}
        onToggleDirectory={vi.fn()}
        onChooseFile={vi.fn()}
        {...props}
      />
    </TooltipProvider>,
  );

describe("the explorer", () => {
  it("names the workspace and lists every file, not only GEDCOM", async () => {
    panel({ rows: await rowsOf() });

    expect(screen.getByText("Webb Family")).toBeTruthy();
    for (const name of ["media", "notes.md", "receipt.pdf", "tree.ged"]) {
      expect(screen.getByText(name), name).toBeTruthy();
    }
  });

  it("says which entries it cannot show", async () => {
    panel({ rows: await rowsOf() });

    const row = screen.getByText("receipt.pdf").closest("button");
    expect(row?.textContent).toContain("not shown");
    expect(
      screen.getByText("tree.ged").closest("button")?.textContent,
    ).not.toContain("not shown");
  });

  // A name is a name. `/` cannot appear in one — it is the separator — so the
  // markup a name can carry looks like this.
  it("shows a name written like markup as text", async () => {
    panel({ rows: await rowsOf() });

    expect(screen.getByText('<img src=x onerror="alert(1)">.ged')).toBeTruthy();
    expect(document.querySelector("li img")).toBeNull();
  });

  it("indents a nested entry by its depth", async () => {
    panel({ rows: await rowsOf(["media"]) });

    const nested = screen.getByText("portrait.jpg").closest("button");
    expect(nested?.style.paddingLeft).toBe("20px");
    expect(screen.getByText("media").closest("button")?.style.paddingLeft).toBe(
      "8px",
    );
  });

  it("asks to expand a directory and to open a file", async () => {
    const onToggleDirectory = vi.fn();
    const onChooseFile = vi.fn();
    panel({ rows: await rowsOf(), onToggleDirectory, onChooseFile });

    await userEvent.click(screen.getByText("media"));
    await userEvent.click(screen.getByText("tree.ged"));

    expect(onToggleDirectory).toHaveBeenCalledWith("media");
    expect(onChooseFile).toHaveBeenCalledWith("tree.ged");
  });

  it("shows a refusal where the workspace put one", () => {
    panel({ notice: "media/portrait.jpg is not in this folder" });

    expect(
      screen.getByText("media/portrait.jpg is not in this folder"),
    ).toBeTruthy();
  });
});

describe("the explorer before a folder is granted", () => {
  it("offers a folder and says it is not remembered", () => {
    panel({ workspaceName: null });

    expect(screen.getByLabelText("Open a folder")).toBeTruthy();
    expect(screen.getByText(/not remembered between visits/)).toBeTruthy();
  });

  // Safari and Firefox: the offer is absent rather than broken, and the reason
  // takes its place.
  it("offers no folder where the browser cannot grant one", () => {
    panel({
      workspaceName: null,
      unavailableReason: "This browser cannot grant a folder to a page.",
    });

    expect(screen.queryByLabelText("Open a folder")).toBeNull();
    expect(screen.getByLabelText("Open a single GEDCOM file")).toBeTruthy();
    expect(screen.getByText(/cannot grant a folder/)).toBeTruthy();
  });

  // A page that asks for a folder on load is one nobody trusts, and the browser
  // refuses a picker it was not asked for.
  it("asks for nothing by itself", () => {
    const onOpenFolder = vi.fn();
    panel({ workspaceName: null, onOpenFolder });

    expect(onOpenFolder).not.toHaveBeenCalled();
  });
});
