export { GedcomLanguageService } from "./languageService";
// Named so a caller of getDocument can type what it gets without reaching
// past this package for the declaration.
export type {
  CreateDocumentOptions,
  GedcomDialect,
  GedcomDocument,
} from "@domorium/validator";
export {
  decodeFileTarget,
  encodeFileTarget,
} from "./libs/links/retargetFileLinks";
export {
  relativeFilePath,
  resolveFileTarget,
} from "./libs/links/fileTargetPath";
export { mentionsFile } from "./libs/links/mentionsFile";
export { drawnCrop } from "./libs/media/drawnCrop";
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
  type CompletionTextEdit,
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
  type MediaCrop,
  type MediaKind,
  type MediaReference,
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
export type {
  DateModifier,
  GedcomDate,
  GedcomDateValue,
  VersionResolution,
} from "@domorium/validator";
