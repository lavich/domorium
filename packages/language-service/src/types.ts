import type { FilePathProblem, PayloadKind } from "@domorium/validator";

export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

/**
 * A half-open span of the document in character offsets.
 *
 * Used where a caller wants an answer about part of the document rather than
 * all of it — a viewport is forty lines and a document can be two hundred
 * thousand records.
 */
export interface OffsetRange {
  from: number;
  to: number;
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
  | "unknown-field"
  | "cardinality-exceeded"
  | "value-not-in-enum"
  | "payload-datatype"
  | "value-spans-lines"
  | "value-not-allowed"
  | "file-target-unsupported"
  | "value-required"
  | "unresolved-pointer"
  | "required-field-missing"
  | "rule-violation"
  | "record-edit-unsupported"
  | "reciprocal-pointer-unsupported"
  | "not-a-structure"
  | "no-dialect"
  | "unknown-path"
  | "not-xref"
  | "unresolved-declaration"
  | "duplicate-declaration"
  | "invalid-new-id"
  | "identifier-collision"
  | "stale-document"
  | "ambiguous-fix"
  | "unsupported-fix"
  | "unwritable-file-target"
  | "not-a-sibling"
  | "reading-changed";

export interface EditRefusal {
  ok: false;
  code: EditRefusalCode;
  message: string;
  diagnosticCode?: string;
  data?: DiagnosticData;
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

export type MediaKind = "image" | "audio" | "video" | "document" | "unknown";

/**
 * A rectangle of the image, as the document wrote it. It may name an extent
 * larger than the image: the extent is not knowable from the document, so
 * clamping belongs to whoever holds the file.
 */
export interface MediaCrop {
  top: number;
  left: number;
  height: number;
  width: number;
}

/**
 * The media a position refers to. `targetText` and `kind` read as they do on a
 * DocumentLink; `range` is the file's own payload, which is not the line the
 * caller asked about when the position was on a link.
 */
export interface MediaReference extends DocumentLink {
  /** What the document says the file is, not what a host can render. */
  mediaKind: MediaKind;
  /** The caption the author wrote, where there is one. */
  title?: string;
  /** Absent where the document names no rectangle, or names one that cannot be applied. */
  crop?: MediaCrop;
}

export type DiagnosticSeverity = "error" | "warning" | "info";

/** The facts a message names, for a host that writes its own message. */
export interface DiagnosticData {
  xref?: string;
  requiredRecordTag?: string;
  expectedLevel?: number;
  missingTag?: string;
  /** Absent where the missing structure belongs at the root. */
  parentTag?: string;
  missingHeader?: boolean;
  day?: number;
  month?: string;
  monthLength?: number;
  year?: number;
  calendar?: string;
  /** Set only where the tag is a standard one written in the wrong case. */
  meantTag?: string;
  tag?: string;
  pathProblem?: FilePathProblem;
}

export interface Diagnostic {
  code: string;
  message: string;
  hint?: string;
  data?: DiagnosticData;
  range: Range;
  severity: DiagnosticSeverity;
}

export interface CodeActionChoice {
  title: string;
  edit: WorkspaceEdit;
}

export interface CodeAction {
  title: string;
  kind: "quickfix" | "source.fixAll";
  diagnostics: Diagnostic[];
  edit?: WorkspaceEdit;
  choices?: CodeActionChoice[];
}

export enum CompletionItemKind {
  Field = 5,
  Reference = 18,
  EnumMember = 20,
}

/** The shape of LSP's `InsertReplaceEdit`, so an adapter passes it on as is. */
export interface CompletionTextEdit {
  newText: string;
  insert: Range;
  replace: Range;
}

export interface CompletionItem {
  label: string;
  kind: CompletionItemKind;
  detail?: string;
  textEdit: CompletionTextEdit;
}

/**
 * Two of the four hosts render this by assigning it to `textContent`, so
 * anything a host would have to interpret arrives as literal characters
 * there. Widening this back to markdown means answering for those two first.
 */
export interface Hover {
  contents: {
    kind: "plaintext";
    value: string;
  };
  range: Range;
}

export interface FoldingRange {
  startLine: number;
  endLine: number;
}

export interface RecordPreviewOptions {
  /** How many lines the host has room for. */
  maxLines: number;
}

export interface RecordPreview {
  /** The record the pointer names, cut to the lines the host asked for. */
  range: Range;
  /** The pointer the position is on, for a host that marks it. */
  pointer: Range;
  truncated: boolean;
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
  /** What a reader calls this record. Absent where the format names none. */
  label?: string;
  kind: DocumentSymbolKind;
  range: Range;
  selectionRange: Range;
  children: DocumentSymbol[];
}

export interface StructureOccurrence {
  range: Range;
  subtreeRange: Range;
  value: string;
}

export interface PointerCandidate {
  xref: string;
  label?: string;
}

export interface StructureFieldDescription {
  id: string;
  schemaId: string;
  tag: string;
  required: boolean;
  min: number;
  max: number | null;
  payload: PayloadKind;
  payloadRequired: boolean;
  lineBreaks: boolean;
  prose: boolean;
  reciprocal: boolean;
  candidates?: PointerCandidate[];
  occurrences: StructureOccurrence[];
}

export interface StructureDescription {
  id: string;
  tag: string;
  schemaId: string;
  version: DocumentVersion;
  range?: Range;
  subtreeRange?: Range;
  value?: string;
  payload: PayloadKind;
  payloadRequired: boolean;
  lineBreaks: boolean;
  prose: boolean;
  extension: boolean;
  fields: StructureFieldDescription[];
  undefinedOccurrences: (StructureOccurrence & { tag: string })[];
}

export type { FilePathProblem, PayloadKind };

export interface StructureValueInput {
  value?: string;
  pointer?: string;
}

export interface StructureInput extends StructureValueInput {
  children?: StructureChildInput[];
}

export interface StructureChildInput extends StructureInput {
  tag: string;
}

export interface StructureEditResult {
  ok: true;
  edit: WorkspaceEdit;
  warnings: Diagnostic[];
}

export type MoveTarget = { before: Position } | { end: true };

export interface MoveSlot {
  target: MoveTarget;
  changesOrder: boolean;
}

export interface MoveDescription {
  ok: true;
  version: DocumentVersion;
  range: Range;
  subtreeRange: Range;
  slots: MoveSlot[];
}

export interface ValueProblem {
  code: EditRefusalCode;
  diagnosticCode: string;
  message: string;
  data?: DiagnosticData;
  severity: DiagnosticSeverity;
}

export interface ValueCheckResult {
  ok: true;
  problems: ValueProblem[];
}
