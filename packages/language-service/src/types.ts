export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export type DocumentVersion = number;

export type ReferenceRole = "declaration" | "usage";

export interface ReferenceOccurrence {
  id: string;
  role: ReferenceRole;
  range: Range;
  recordTag?: string;
  fieldTag: string;
}

export interface ReferenceEntry {
  id: string;
  declarations: ReferenceOccurrence[];
  usages: ReferenceOccurrence[];
}

export interface ReferenceOptions {
  includeDeclaration: boolean;
}

export interface DocumentHighlight {
  range: Range;
  kind: "read" | "write";
}

export interface TextEdit {
  range: Range;
  newText: string;
}

export interface WorkspaceEdit {
  version: DocumentVersion;
  edits: TextEdit[];
}

export type EditRefusalCode =
  | "not-xref"
  | "unresolved-declaration"
  | "duplicate-declaration"
  | "invalid-new-id"
  | "identifier-collision"
  | "stale-document"
  | "ambiguous-fix"
  | "unsupported-fix";

export interface EditRefusal {
  ok: false;
  code: EditRefusalCode;
  message: string;
}

export interface PrepareRenameResult {
  ok: true;
  range: Range;
  placeholder: string;
  version: DocumentVersion;
}

export interface WorkspaceEditResult {
  ok: true;
  edit: WorkspaceEdit;
}

export type DocumentLinkKind = "http" | "file-relative" | "file-absolute";

export interface DocumentLink {
  range: Range;
  targetText: string;
  kind: DocumentLinkKind;
}

export type DiagnosticSeverity = "error" | "warning" | "info";

export interface Diagnostic {
  code: string;
  message: string;
  hint?: string;
  data?: {
    xref?: string;
    requiredRecordTag?: string;
    expectedLevel?: number;
  };
  range: Range;
  severity: DiagnosticSeverity;
}

export interface CodeActionChoice {
  title: string;
  edit: WorkspaceEdit;
}

export interface CodeAction {
  title: string;
  kind: "quickfix";
  diagnostics: Diagnostic[];
  edit?: WorkspaceEdit;
  choices?: CodeActionChoice[];
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
