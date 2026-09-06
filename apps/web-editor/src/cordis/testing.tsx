import type { ReactNode } from "react";

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

export function InApp({
  app,
  children,
}: {
  app: AppContext;
  children: ReactNode;
}) {
  return (
    <CordisProvider ctx={app.ctx}>
      <TooltipProvider>{children}</TooltipProvider>
    </CordisProvider>
  );
}
