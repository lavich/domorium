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
 * What this application is made of. The panels below are the whole contribution:
 * removing one from this list removes its rail button, its panel and its
 * subscriptions, and nothing else has to be told.
 *
 * The services are constructed rather than plugged because `ctx.plugin` settles a
 * microtask later, and the first render must already find them.
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
  /**
   * Settles once the panels have contributed. `ctx.plugin` is a microtask, so the
   * first render finds an empty rail however synchronous the plugins themselves
   * are; a test that asserts on the rail waits for this.
   */
  ready: Promise<void>;
}
