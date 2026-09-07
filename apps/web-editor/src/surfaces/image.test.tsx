import { Context } from "cordis";
import { describe, expect, it } from "vitest";

import { SurfaceService, type DocumentSurface } from "@/services/surfaces";
import { WorkspaceService } from "@/services/workspace";
import { imageSurface } from "./image";

async function mounted(): Promise<DocumentSurface<"image">> {
  const ctx = new Context();
  new WorkspaceService(ctx);
  new SurfaceService(ctx);
  await ctx.plugin(imageSurface);
  return ctx.surfaces.get("image") as DocumentSurface<"image">;
}

describe("the surface that shows a picture", () => {
  it("claims the picture extensions and nothing else", async () => {
    const surface = await mounted();

    expect(surface.claims("media/portrait.JPG")).toBe(true);
    expect(surface.claims("a.png")).toBe(true);
    expect(surface.claims("a.webp")).toBe(true);
    expect(surface.claims("a.svg")).toBe(true);
    expect(surface.claims("tree.ged")).toBe(false);
    expect(surface.claims("png.md")).toBe(false);
  });

  // Bytes, not text: reading a photograph as a string would corrupt it, and the
  // preview asks the gateway itself.
  it("leaves the file unread for the preview to fetch as bytes", async () => {
    const surface = await mounted();

    expect(surface.reads).toBe("nothing");
    expect(surface.editable ?? false).toBe(false);
  });

  it("states the format, the size on disk and the decoded dimensions", async () => {
    const surface = await mounted();

    expect(
      surface.facts?.({
        kind: "image",
        format: "PNG",
        bytes: 2048,
        width: 640,
        height: 480,
      }),
    ).toEqual(["PNG", "640 × 480", "2 KB"]);
  });

  // The browser has not decoded it yet, and a dimension of nothing is not "0 × 0".
  it("leaves the dimensions out until the browser has decoded the picture", async () => {
    const surface = await mounted();

    expect(
      surface.facts?.({
        kind: "image",
        format: "PNG",
        bytes: 2048,
        width: null,
        height: null,
      }),
    ).toEqual(["PNG", "2 KB"]);
  });
});
