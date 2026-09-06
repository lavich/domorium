import { Context } from "cordis";

import { explorerPanel } from "@/panels/explorer";
import { problemsPanel } from "@/panels/problems";
import { searchAction } from "@/panels/search";
import { CommandService } from "@/services/commands";
import { EditorService } from "@/services/editor";
import { GatewayService } from "@/services/files";
import { RailService } from "@/services/rail";
import { WorkspaceService } from "@/services/workspace";

/**
 * The services are constructed rather than plugged because `ctx.plugin` settles a
 * microtask later, and the first render must already find them. A test that
 * asserts on what a panel contributed waits on `ready` for the same reason.
 */
export function createAppContext(): AppContext {
  const ctx = new Context();

  new WorkspaceService(ctx);
  new EditorService(ctx);
  new CommandService(ctx);
  new RailService(ctx);
  new GatewayService(ctx);

  const panels = [
    ctx.plugin(explorerPanel),
    ctx.plugin(searchAction),
    ctx.plugin(problemsPanel),
  ];

  return { ctx, ready: Promise.all(panels).then(() => undefined) };
}

export interface AppContext {
  ctx: Context;
  ready: Promise<void>;
}
