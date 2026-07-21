export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export type DiagnosticSeverity = "error" | "warning" | "info";

export interface Diagnostic {
  code: string;
  message: string;
  hint?: string;
  range: Range;
  severity: DiagnosticSeverity;
}

export enum CompletionItemKind {
  Field = 5,
  Reference = 18,
  EnumMember = 20,
}

export interface CompletionItem {
  label: string;
  kind: CompletionItemKind;
  detail?: string;
}

export interface Hover {
  contents: {
    kind: "markdown";
    value: string;
  };
  range: Range;
}

export interface FoldingRange {
  startLine: number;
  endLine: number;
}

export interface InlayHint {
  position: Position;
  label: string;
  paddingRight?: boolean;
}

export enum DocumentSymbolKind {
  Field = 8,
  Object = 19,
}

export interface DocumentSymbol {
  name: string;
  detail?: string;
  kind: DocumentSymbolKind;
  range: Range;
  selectionRange: Range;
  children: DocumentSymbol[];
}
