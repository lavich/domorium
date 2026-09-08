import { Context } from "cordis";
import { describe, expect, it } from "vitest";

import { createMemoryGateway } from "@/workspace/memoryGateway";
import { FilesService, GatewayService } from "./files";

const named = (name: string) =>
  createMemoryGateway({ "tree.ged": "0 HEAD\n" }, { name });

const withGateways = () => {
  const ctx = new Context();
  new GatewayService(ctx);
  return ctx;
};

describe("the workspace a gateway is opened on", () => {
  it("answers with the name of the one that is open", async () => {
    const ctx = withGateways();

    await ctx.gateways.open(named("Webb Family"));

    expect(ctx.files.label).toBe("Webb Family");
  });

  it("replaces the one before it", async () => {
    const ctx = withGateways();

    await ctx.gateways.open(named("Webb Family"));
    await ctx.gateways.open(named("Simpson Family"));

    expect(ctx.files.label).toBe("Simpson Family");
  });

  // Two opened at once used to race for the one `files` name, and cordis refuses
  // a second provider: one call threw and the workspace that arrived was neither
  // the one it asked for nor the one the caller was told about.
  it("opens one at a time when two are asked for at once", async () => {
    const ctx = withGateways();

    await Promise.all([
      ctx.gateways.open(named("Webb Family")),
      ctx.gateways.open(named("Simpson Family")),
    ]);

    expect(ctx.files.label).toBe("Simpson Family");
  });

  // A refusal used to settle the queue as rejected, and every workspace asked
  // for afterwards was refused with an error about the one before it.
  it("goes on opening workspaces after one of them was refused", async () => {
    const ctx = withGateways();
    const intruder = ctx.plugin(FilesService, named("Intruder"));
    await intruder;

    await expect(ctx.gateways.open(named("Webb Family"))).rejects.toThrow(
      /registered/,
    );
    await intruder.dispose();
    await ctx.gateways.open(named("Webb Family"));

    expect(ctx.files.label).toBe("Webb Family");
  });
});
