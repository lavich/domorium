import { Service, type Context } from "cordis";

import {
  activeFile,
  emptyWorkspace,
  workspaceReducer,
  type OpenFile,
  type Workspace,
  type WorkspaceAction,
} from "@/workspace/workspace";

/** Owns when the reducer runs and who hears about it, not what it decides. */
export class WorkspaceService extends Service {
  private state: Workspace = emptyWorkspace;
  private readonly listeners = new Set<() => void>();

  constructor(ctx: Context) {
    super(ctx, "workspace");
  }

  get snapshot(): Workspace {
    return this.state;
  }

  get active(): OpenFile | null {
    return activeFile(this.state);
  }

  dispatch(action: WorkspaceAction): void {
    const next = workspaceReducer(this.state, action);
    if (next === this.state) {
      return;
    }
    this.state = next;
    // Copied: a listener that unsubscribes on being called would otherwise cut
    // the iteration short for the ones after it.
    for (const listener of [...this.listeners]) {
      listener();
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

declare module "cordis" {
  interface Context {
    workspace: WorkspaceService;
  }
}
