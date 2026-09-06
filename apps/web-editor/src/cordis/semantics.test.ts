import { describe, expect, it } from "vitest";
import { Context, Service } from "cordis";

class Probe extends Service {
  constructor(
    ctx: Context,
    public label: string,
  ) {
    super(ctx, "probe");
  }
}

declare module "cordis" {
  interface Context {
    probe: Probe;
  }
}

describe("cordis semantics the bridge relies on", () => {
  it("swaps a service by disposing its fiber", async () => {
    const ctx = new Context();
    const seen: (string | undefined)[] = [];
    ctx.on("internal/service", (name, value) => {
      if (name === "probe") {
        seen.push((value as Probe | undefined)?.label);
      }
    });

    const first = ctx.plugin(Probe, "demo");
    await first;
    expect(ctx.probe.label).toBe("demo");

    await first.dispose();
    const second = ctx.plugin(Probe, "folder");
    await second;
    expect(ctx.probe.label).toBe("folder");
    expect(seen).toEqual(["demo", "demo", undefined, "folder"]);
  });

  it("reruns injected fibers and disposes their effects", async () => {
    const ctx = new Context();
    const log: string[] = [];
    ctx.inject(["probe"], (inner) => {
      const label = inner.probe.label;
      log.push(`up:${label}`);
      inner.effect(() => () => log.push(`down:${label}`));
    });

    const first = ctx.plugin(Probe, "demo");
    await first;
    await first.dispose();
    const second = ctx.plugin(Probe, "folder");
    await second;
    expect(log).toEqual(["up:demo", "down:demo", "up:folder"]);
  });

  it("keeps identity unstable across reads", async () => {
    const ctx = new Context();
    await ctx.plugin(Probe, "demo");
    expect(ctx.get("probe", false)).not.toBe(ctx.get("probe", false));
    expect(ctx.probe.label).toBe("demo");
  });
});
