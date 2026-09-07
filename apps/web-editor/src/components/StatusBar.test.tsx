// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { Context } from "cordis";
import { afterEach, describe, expect, it } from "vitest";

import { StatusBar } from "./StatusBar";
import { CordisProvider } from "@/cordis/react";
import { SurfaceService, type DocumentSurface } from "@/services/surfaces";
import { WorkspaceService } from "@/services/workspace";

afterEach(cleanup);

const bar = () => screen.getByRole("contentinfo").textContent ?? "";

const STANDING = "read locally — nothing is uploaded";

function barWith(
  surface: Partial<DocumentSurface<"markdown">>,
  opened: boolean,
  report: { kind: "markdown" } | null = { kind: "markdown" },
) {
  const ctx = new Context();
  new WorkspaceService(ctx);
  new SurfaceService(ctx);
  ctx.surfaces.register({
    id: "markdown",
    claims: () => true,
    reads: "text",
    render: () => null,
    ...surface,
  });

  if (opened) {
    ctx.workspace.dispatch({
      type: "workspace-opened",
      name: "Webb Family",
      writable: true,
    });
    ctx.workspace.dispatch({
      type: "file-opened",
      path: "notes.md",
      kind: "markdown",
      editable: false,
      text: "# Note",
    });
    if (report) {
      ctx.workspace.dispatch({ type: "reported", path: "notes.md", report });
    }
  }

  render(
    <CordisProvider ctx={ctx}>
      <StatusBar />
    </CordisProvider>,
  );
}

describe("what the bar says about the file in front", () => {
  it("states the facts the file's own surface gives it", () => {
    barWith({ facts: () => ["Markdown", "read-only"] }, true);

    expect(bar()).toContain("Markdown");
    expect(bar()).toContain("read-only");
    expect(bar()).toContain(STANDING);
  });

  // A stale version and a stale count are what this bar was reading before.
  it("states only what is true of the window when nothing is open", () => {
    barWith({ facts: () => ["Markdown"] }, false);

    expect(bar()).toBe(STANDING);
  });

  it("states nothing of a file whose surface has not reported yet", () => {
    barWith({ facts: () => ["Markdown"] }, true, null);

    expect(bar()).toBe(STANDING);
  });

  it("states nothing of a surface that offers no facts at all", () => {
    barWith({}, true);

    expect(bar()).toBe(STANDING);
  });
});
