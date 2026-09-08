import { Context } from "cordis";

import { explorerPanel } from "@/panels/explorer";
import { CommandService } from "@/services/commands";
import { GatewayService } from "@/services/files";
import { RailService } from "@/services/rail";
import { SurfaceService } from "@/services/surfaces";
import { WorkspaceService } from "@/services/workspace";
import { gedcomSurface } from "@/surfaces/gedcom";
import { imageSurface } from "@/surfaces/image";
import { markdownSurface } from "@/surfaces/markdown";

/**
 * The services are constructed rather than plugged because `ctx.plugin` settles a
 * microtask later, and the first render must already find them. A test that
 * asserts on what a plugin contributed waits on `ready` for the same reason.
 */
export function createAppContext(): AppContext {
  const ctx = new Context();

  new WorkspaceService(ctx);
  new CommandService(ctx);
  new RailService(ctx);
  new SurfaceService(ctx);
  new GatewayService(ctx);

  const plugins = [
    ctx.plugin(explorerPanel),
    ctx.plugin(gedcomSurface),
    ctx.plugin(markdownSurface),
    ctx.plugin(imageSurface),
  ];

  return { ctx, ready: Promise.all(plugins).then(() => undefined) };
}

export interface AppContext {
  ctx: Context;
  ready: Promise<void>;
}
