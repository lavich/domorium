import type { Context } from "cordis";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/components/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { WorkspaceAction } from "@/workspace/workspace";
import { createAppContext, type AppContext } from "./app";
import { CordisProvider } from "./react";

export async function testApp(
  ...actions: WorkspaceAction[]
): Promise<AppContext> {
  const app = createAppContext();
  await app.ready;

  const { ctx } = app;
  ctx.commands.register("workspace.openFile", () => {});
  ctx.commands.register("workspace.openFolder", () => {});
  ctx.commands.register("workspace.chooseFile", () => {});
  ctx.commands.register("workspace.followLink", () => {});
  ctx.commands.register("workspace.activateTab", (path) =>
    ctx.workspace.dispatch({ type: "file-activated", path }),
  );
  ctx.commands.register("workspace.closeTab", (path) =>
    ctx.workspace.dispatch({ type: "file-closed", path }),
  );

  for (const action of actions) {
    ctx.workspace.dispatch(action);
  }
  return app;
}

/**
 * Opens a file the way the shell does — through the registry, so a test never
 * has to name the surface a path belongs to.
 */
export function opened(ctx: Context, path: string, text = "0 HEAD\n") {
  const surface = ctx.surfaces.claiming(path);
  if (!surface) {
    ctx.workspace.dispatch({ type: "file-unsupported", path });
    return;
  }
  ctx.workspace.dispatch({
    type: "file-opened",
    path,
    kind: surface.id,
    editable: surface.editable ?? false,
    text: surface.reads === "text" ? text : null,
  });
}

export function InApp({
  app,
  children,
}: {
  app: AppContext;
  children: ReactNode;
}) {
  return (
    <CordisProvider ctx={app.ctx}>
      <ThemeProvider>
        <TooltipProvider>{children}</TooltipProvider>
      </ThemeProvider>
    </CordisProvider>
  );
}
