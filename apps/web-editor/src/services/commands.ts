import { Service, type Context } from "cordis";

import type { DocumentLink } from "@domorium/codemirror";

/** A plugin that adds a command declares it here, the way a service is declared. */
export interface Commands {
  "workspace.openFile"(): void;
  "workspace.openFolder"(): void;
  "workspace.chooseFile"(path: string): void;
  "workspace.save"(): void;
  "workspace.saveAs"(): void;
  "workspace.download"(): void;
  "workspace.reset"(): void;
  "workspace.activateTab"(path: string): void;
  "workspace.closeTab"(path: string): void;
  "workspace.followLink"(link: DocumentLink): void;
}

type Handler = (...args: never[]) => void;

export class CommandService extends Service {
  private readonly handlers = new Map<string, Handler>();

  constructor(ctx: Context) {
    super(ctx, "commands");
  }

  /** Registered for as long as the fiber that registered it lives. */
  register<K extends keyof Commands>(id: K, run: Commands[K]) {
    return this.ctx.effect(
      () => {
        if (this.handlers.has(id)) {
          throw new Error(`command "${id}" is already registered`);
        }
        this.handlers.set(id, run as Handler);
        return () => this.handlers.delete(id);
      },
      `commands.register(${JSON.stringify(id)})`,
    );
  }

  has(id: keyof Commands): boolean {
    return this.handlers.has(id);
  }

  execute<K extends keyof Commands>(
    id: K,
    ...args: Parameters<Commands[K]>
  ): void {
    const run = this.handlers.get(id);
    if (!run) {
      throw new Error(`no command "${id}" is registered`);
    }
    (run as (...rest: Parameters<Commands[K]>) => void)(...args);
  }
}

declare module "cordis" {
  interface Context {
    commands: CommandService;
  }
}
