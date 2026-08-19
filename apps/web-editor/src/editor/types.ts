import type { VersionResolution } from "@domorium/language-service";

export type WebTheme = "light" | "dark";

export interface WebDiagnostic {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  from: number;
  to: number;
  line: number;
  character: number;
}

export interface WebEditorStatus {
  line: number;
  character: number;
  resolution: VersionResolution | undefined;
}

/**
 * What a surface knows about the document it is showing. One channel per kind of
 * file, so the window states facts about the tab in front rather than about the
 * last GEDCOM document it was handed.
 */
export type DocumentReport =
  | {
      kind: "gedcom";
      status: WebEditorStatus;
      diagnostics: WebDiagnostic[];
    }
  | { kind: "markdown" }
  | {
      kind: "image";
      format: string;
      bytes: number;
      /** Absent until the browser has decoded the bytes. */
      width: number | null;
      height: number | null;
    };

export interface GedcomEditorHandle {
  /**
   * The document as it stands. The editor owns it, so the application asks
   * when it needs it — on save — rather than being handed a copy per edit.
   */
  getText(): string;
  destroy(): void;
  focusDiagnostic(diagnostic: WebDiagnostic): void;
  setTheme(theme: WebTheme): void;
  openSearch(): void;
}
