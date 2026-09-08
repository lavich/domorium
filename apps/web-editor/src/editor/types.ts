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
 * What each surface knows about the document it is showing. A surface adds its
 * entry here, the way a plugin adds a command to `Commands` — one channel per
 * kind of file, so the window states facts about the tab in front rather than
 * about the last GEDCOM document it was handed.
 */
export interface DocumentReports {
  gedcom: {
    status: WebEditorStatus;
    diagnostics: WebDiagnostic[];
  };
  markdown: Record<never, never>;
  image: {
    format: string;
    bytes: number;
    /** Absent until the browser has decoded the bytes. */
    width: number | null;
    height: number | null;
  };
}

/** Also the `kind` a file opened by that surface carries. */
export type SurfaceId = keyof DocumentReports;

export type DocumentReport = {
  [K in SurfaceId]: { kind: K } & DocumentReports[K];
}[SurfaceId];

/** The report of one surface, for the surface that knows how to read it. */
export type ReportOf<K extends SurfaceId> = { kind: K } & DocumentReports[K];

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
