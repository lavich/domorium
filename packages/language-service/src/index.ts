export { GedcomLanguageService } from "./languageService";
// Named so a caller of getDocument can type what it gets without reaching
// past this package for the declaration.
export type {
  CreateDocumentOptions,
  GedcomDocument,
} from "@domorium/validator";
export {
  decodeFileTarget,
  encodeFileTarget,
} from "./libs/links/retargetFileLinks";
export { ReferenceIndex } from "./libs/references/referenceIndex";
export {
  legend as semanticTokenLegend,
  type SemanticToken,
} from "./libs/semantic/semanticTokens";
export {
  type CodeAction,
  type CodeActionChoice,
  CompletionItemKind,
  DocumentSymbolKind,
  type CompletionItem,
  type Diagnostic,
  type DiagnosticSeverity,
  type DocumentVersion,
  type DocumentHighlight,
  type DocumentLink,
  type DocumentLinkKind,
  type EditRefusal,
  type EditRefusalCode,
  type DocumentSymbol,
  type FoldingRange,
  type Hover,
  type InlayHint,
  type Position,
  type PrepareRenameResult,
  type OffsetRange,
  type Range,
  type RecordPreview,
  type RecordPreviewOptions,
  type ReferenceEntry,
  type ReferenceOccurrence,
  type ReferenceOptions,
  type ReferenceRole,
  type TextEdit,
  type WorkspaceEdit,
  type WorkspaceEditResult,
} from "./types";
export type { VersionResolution } from "@domorium/validator";
