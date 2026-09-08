import { Context } from "cordis";
import { describe, expect, it } from "vitest";

import { SurfaceService, type DocumentSurface } from "./surfaces";

const surface = (
  id: DocumentSurface["id"],
  claims: (path: string) => boolean,
  rest: Partial<DocumentSurface> = {},
): DocumentSurface => ({
  id,
  claims,
  reads: "text",
  render: () => null,
  ...rest,
});

const extension = (suffix: string) => (path: string) => path.endsWith(suffix);

function surfaceContext(): Context {
  const ctx = new Context();
  new SurfaceService(ctx);
  return ctx;
}

describe("SurfaceService", () => {
  it("hands a path to the surface that claims it", () => {
    const ctx = surfaceContext();
    ctx.surfaces.register(surface("gedcom", extension(".ged")));
    ctx.surfaces.register(surface("markdown", extension(".md")));

    expect(ctx.surfaces.claiming("tree.ged")?.id).toBe("gedcom");
    expect(ctx.surfaces.claiming("notes.md")?.id).toBe("markdown");
  });

  // Registration order is the order plugins happen to be plugged in, which is
  // not something a surface should have to win.
  it("lets order settle a path two surfaces claim", () => {
    const ctx = surfaceContext();
    ctx.surfaces.register(surface("markdown", () => true, { order: 20 }));
    ctx.surfaces.register(surface("gedcom", () => true, { order: 10 }));

    expect(ctx.surfaces.claiming("ambiguous")?.id).toBe("gedcom");
  });

  it("claims nothing for a file no surface offered to show", () => {
    const ctx = surfaceContext();
    ctx.surfaces.register(surface("gedcom", extension(".ged")));

    expect(ctx.surfaces.claiming("archive.zip")).toBeUndefined();
  });

  // Two surfaces under one id would silently shadow each other, and which one
  // won would depend on the order plugins happened to be plugged.
  it("refuses a second surface under an id already taken", () => {
    const ctx = surfaceContext();
    ctx.surfaces.register(surface("gedcom", extension(".ged")));

    expect(() =>
      ctx.surfaces.register(surface("gedcom", extension(".gedcom"))),
    ).toThrow(/gedcom/);
  });

  it("withdraws the surface of a plugin that is unplugged", async () => {
    const ctx = surfaceContext();
    const plugin = ctx.plugin((inner: Context) => {
      inner.surfaces.register(surface("gedcom", extension(".ged")));
    });
    await plugin;
    expect(ctx.surfaces.claiming("tree.ged")?.id).toBe("gedcom");

    await plugin.dispose();
    expect(ctx.surfaces.claiming("tree.ged")).toBeUndefined();
  });

  // Saving asks the mounted document for its text, and between a tab being left
  // and its replacement mounting there is no document to ask.
  it("asks the mounted document for its text, and holds none once it is gone", () => {
    const ctx = surfaceContext();
    expect(ctx.surfaces.text()).toBeUndefined();

    ctx.surfaces.attach({ getText: () => "0 HEAD\n" });
    expect(ctx.surfaces.text()).toBe("0 HEAD\n");

    ctx.surfaces.attach(null);
    expect(ctx.surfaces.text()).toBeUndefined();
  });

  it("finds an open file's surface by the kind it carries", () => {
    const ctx = surfaceContext();
    ctx.surfaces.register(surface("gedcom", extension(".ged")));

    expect(ctx.surfaces.get("gedcom")?.id).toBe("gedcom");
    expect(ctx.surfaces.get("image")).toBeUndefined();
  });
});
