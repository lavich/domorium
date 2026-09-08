import { Context } from "cordis";
import { FilesIcon } from "lucide-react";
import { describe, expect, it } from "vitest";

import { RailService } from "./rail";

const item = (id: string, order?: number) => ({
  id,
  order,
  icon: FilesIcon,
  label: () => id,
  slot: "side" as const,
  render: () => null,
});

function railContext(): Context {
  const ctx = new Context();
  new RailService(ctx);
  return ctx;
}

describe("RailService", () => {
  it("orders items by order, then by registration", () => {
    const ctx = railContext();
    ctx.rail.item(item("problems", 2));
    ctx.rail.item(item("explorer", 1));
    ctx.rail.item(item("timeline", 2));

    expect(ctx.rail.snapshot.items.map((entry) => entry.id)).toEqual([
      "explorer",
      "problems",
      "timeline",
    ]);
  });

  it("withdraws the items of a plugin that is unplugged", async () => {
    const ctx = railContext();
    const panel = ctx.plugin((inner: Context) => {
      inner.rail.item(item("problems"));
    });
    await panel;
    expect(ctx.rail.snapshot.items).toHaveLength(1);

    await panel.dispose();
    expect(ctx.rail.snapshot.items).toEqual([]);
  });

  it("keeps one panel open per slot", () => {
    const ctx = railContext();
    ctx.rail.item({ ...item("explorer"), defaultOpen: true });
    ctx.rail.item({ ...item("problems"), defaultOpen: false });

    expect(ctx.rail.openIn("side")?.id).toBe("explorer");
    ctx.rail.toggle("problems");
    expect(ctx.rail.openIn("side")?.id).toBe("problems");
    ctx.rail.toggle("problems");
    expect(ctx.rail.openIn("side")).toBeUndefined();
  });

  it("runs an item that has no panel instead of opening one", () => {
    const ctx = railContext();
    let ran = 0;
    ctx.rail.item({
      id: "search",
      icon: FilesIcon,
      label: () => "Find in file",
      activate: () => (ran += 1),
    });

    ctx.rail.toggle("search");
    expect(ran).toBe(1);
    expect(ctx.rail.openIn("side")).toBeUndefined();
  });

  it("notifies subscribers when the contributions change", () => {
    const ctx = railContext();
    let seen = 0;
    ctx.rail.subscribe(() => (seen += 1));
    const off = ctx.rail.item(item("explorer"));
    expect(seen).toBe(1);
    void off();
    expect(seen).toBe(2);
  });
});
