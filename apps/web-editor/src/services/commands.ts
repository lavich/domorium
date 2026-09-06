import { Service, type Context } from "cordis";

/**
 * Every action a panel can ask for without being wired to whoever performs it.
 * A plugin that adds one declares it here, the way a service is declared.
 */
export interface Commands {
  "workspace.openFile"(): void;
  "workspace.openFolder"(): void;
  "workspace.chooseFile"(path: string): void;
  "workspace.activateTab"(path: string): void;
  "workspace.closeTab"(path: string): void;
}

type Handler = (...args: never[]) => void;

/** Registered for as long as the fiber that registered it lives. */
export class CommandService extends Service {
  private readonly handlers = new Map<string, Handler>();

  constructor(ctx: Context) {
    super(ctx, "commands");
  }

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
