export type WebTheme = "light" | "dark";

export interface WebDiagnostic {
  severity: "error" | "warning" | "info";
  message: string;
  from: number;
  to: number;
  line: number;
  character: number;
}

export interface GedcomEditorHandle {
  destroy(): void;
  focusDiagnostic(diagnostic: WebDiagnostic): void;
  setTheme(theme: WebTheme): void;
}
