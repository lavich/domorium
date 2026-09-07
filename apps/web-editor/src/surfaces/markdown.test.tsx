// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { Context } from "cordis";
import { afterEach, describe, expect, it } from "vitest";

import { CordisProvider } from "@/cordis/react";
import { SurfaceService, type DocumentSurface } from "@/services/surfaces";
import { WorkspaceService } from "@/services/workspace";
import { markdownSurface } from "./markdown";

afterEach(cleanup);

async function mounted(): Promise<{
  ctx: Context;
  surface: DocumentSurface<"markdown">;
}> {
  const ctx = new Context();
  new WorkspaceService(ctx);
  new SurfaceService(ctx);
  await ctx.plugin(markdownSurface);
  return {
    ctx,
    surface: ctx.surfaces.get("markdown") as DocumentSurface<"markdown">,
  };
}

const note = (path: string) => ({
  path,
  name: path.slice(path.lastIndexOf("/") + 1),
  kind: "markdown" as const,
  editable: false,
  initialText: "# Anna\n\nborn 1873\n",
  modified: false,
  report: null,
  editorKey: 0,
});

describe("the surface that shows a note", () => {
  it("claims the note extensions and nothing else", async () => {
    const { surface } = await mounted();

    expect(surface.claims("notes.md")).toBe(true);
    expect(surface.claims("a/b/README.MARKDOWN")).toBe(true);
    expect(surface.claims("tree.ged")).toBe(false);
    expect(surface.claims("markdown.ged")).toBe(false);
  });

  // Rendering it would mean running the HTML and the scripts that came out of
  // someone else's export.
  it("shows the note as the text it is, and never lets it be edited", async () => {
    const { ctx, surface } = await mounted();
    render(
      <CordisProvider ctx={ctx}>
        {surface.render(note("notes.md"))}
      </CordisProvider>,
    );

    expect(surface.editable ?? false).toBe(false);
    expect(screen.getByText(/born 1873/)).toBeTruthy();
  });

  it("tells the window it is a note that cannot be written", async () => {
    const { surface } = await mounted();

    expect(surface.facts?.({ kind: "markdown" })).toEqual([
      "Markdown",
      "read-only",
    ]);
  });
});
