import { Service, type Context } from "cordis";

import type { GedcomEditorHandle, WebDiagnostic } from "@/editor/types";

/**
 * The editor showing the tab in front, for the commands and panels that have to
 * reach it. Null between a tab being left and its replacement mounting.
 */
export class EditorService extends Service {
  private handle: GedcomEditorHandle | null = null;

  constructor(ctx: Context) {
    super(ctx, "editor");
  }

  attach(handle: GedcomEditorHandle | null): void {
    this.handle = handle;
  }

  get attached(): boolean {
    return this.handle !== null;
  }

  /** Undefined where no editor holds a document; the caller falls back to disk. */
  getText(): string | undefined {
    return this.handle?.getText();
  }

  focusDiagnostic(diagnostic: WebDiagnostic): void {
    this.handle?.focusDiagnostic(diagnostic);
  }

  openSearch(): void {
    this.handle?.openSearch();
  }
}

declare module "cordis" {
  interface Context {
    editor: EditorService;
  }
}
