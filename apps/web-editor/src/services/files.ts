import { Service, type Context, type Fiber } from "cordis";

import type { FileGateway, FileOperations } from "@/workspace/fileGateway";

/**
 * The workspace's own name is `label`: `Service` owns `name`, and every service
 * answers with the key it is reached by.
 */
export class FilesService extends Service implements FileOperations {
  constructor(
    ctx: Context,
    private readonly gateway: FileGateway,
  ) {
    super(ctx, "files");
  }

  get label(): string {
    return this.gateway.name;
  }

  get writable(): boolean {
    return this.gateway.writable;
  }

  get folder(): boolean {
    return this.gateway.folder;
  }

  list(path: string) {
    return this.gateway.list(path);
  }

  readText(path: string) {
    return this.gateway.readText(path);
  }

  readBytes(path: string) {
    return this.gateway.readBytes(path);
  }

  writeText(path: string, text: string) {
    return this.gateway.writeText(path, text);
  }

  create(path: string, text: string) {
    return this.gateway.create(path, text);
  }
}

/**
 * Disposing the fiber that provided a gateway is what reruns everything injected
 * on `files` and unwinds what the workspace being left had registered.
 */
export class GatewayService extends Service {
  private mounted: Fiber | undefined;

  constructor(ctx: Context) {
    super(ctx, "gateways");
  }

  /**
   * cordis refuses a second provider of a name, so the old fiber has to be gone
   * before the new one is plugged, not merely asked to go.
   */
  async open(gateway: FileGateway): Promise<void> {
    await this.mounted?.dispose();
    this.mounted = this.ctx.plugin(FilesService, gateway);
    await this.mounted;
  }
}

declare module "cordis" {
  interface Context {
    files: FilesService;
    gateways: GatewayService;
  }

  interface Events {
    "files/changed"(): void;
  }
}
