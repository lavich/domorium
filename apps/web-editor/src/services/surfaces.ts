import { Service, type Context } from "cordis";
import type { ReactNode } from "react";

import type { ReportOf, SurfaceId } from "@/editor/types";
import type { OpenFile } from "@/workspace/workspace";

/** What a surface shows a file, and what it tells the window about it. */
export interface DocumentSurface<K extends SurfaceId = SurfaceId> {
  id: K;
  /** Ascending; ties keep registration order. */
  order?: number;
  /** By name alone: nothing has been read when this is asked. */
  claims(path: string): boolean;
  /** Whether the file's text is read before it opens, or by the surface itself. */
  reads: "text" | "nothing";
  /** A surface whose document can be changed and saved. */
  editable?: boolean;
  render(file: OpenFile): ReactNode;
  /**
   * What the status bar states about a file this surface is showing. The bar
   * rules them apart, so a surface says the facts and not how they are laid out.
   *
   * A surface is handed only its own reports: a file's `kind` names the surface
   * showing it, and that surface is the only thing that reports on it. Nothing in
   * the type says so once the surface is in the registry under `SurfaceId`.
   */
  facts?(report: ReportOf<K>): ReactNode[];
}

/**
 * The document a surface has mounted, for the one question the shell asks of it:
 * saving needs the text as it stands, and the surface owns it.
 */
export interface DocumentHandle {
  getText(): string;
}

export class SurfaceService extends Service {
  private readonly registered = new Map<SurfaceId, DocumentSurface>();
  private readonly listeners = new Set<() => void>();
  private ordered: readonly DocumentSurface[] = [];
  private mounted: DocumentHandle | null = null;

  constructor(ctx: Context) {
    super(ctx, "surfaces");
  }

  attach(handle: DocumentHandle | null): void {
    this.mounted = handle;
  }

  text(): string | undefined {
    return this.mounted?.getText();
  }

  register<K extends SurfaceId>(surface: DocumentSurface<K>) {
    return this.ctx.effect(
      () => {
        if (this.registered.has(surface.id)) {
          throw new Error(`surface "${surface.id}" is already registered`);
        }
        this.registered.set(surface.id, surface);
        this.publish();
        return () => {
          this.registered.delete(surface.id);
          this.publish();
        };
      },
      `surfaces.register(${JSON.stringify(surface.id)})`,
    );
  }

  claiming(path: string): DocumentSurface | undefined {
    return this.ordered.find((surface) => surface.claims(path));
  }

  get(id: SurfaceId): DocumentSurface | undefined {
    return this.registered.get(id);
  }

  /** Stable between changes, so it can be read as a snapshot. */
  get snapshot(): readonly DocumentSurface[] {
    return this.ordered;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private publish(): void {
    this.ordered = [...this.registered.values()].sort(
      (one, other) => (one.order ?? 0) - (other.order ?? 0),
    );
    for (const listener of [...this.listeners]) {
      listener();
    }
  }
}

declare module "cordis" {
  interface Context {
    surfaces: SurfaceService;
  }
}
