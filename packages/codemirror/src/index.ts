export {
  createGedcomExtensions,
  createStandaloneEditorExtensions,
  documentLinkTag,
  getDiagnosticActions,
  getDocumentLinkSpecs,
  getReferenceHighlightSpecs,
  HOVER_TIME_MS,
  semanticTokenTag,
  tokenClass,
  SETTLE_DELAY_MS,
  type GedcomEditorActions,
  type GedcomEditorOptions,
  type GedcomEditorSettings,
  type DocumentLinkSpec,
  type ReferenceHighlightSpec,
  type StandaloneEditorOptions,
} from "./extensions.js";
export {
  hoveredPointer,
  hoveredPointerField,
  setHoveredPointer,
} from "./hoveredPointer.js";
export {
  offsetToPosition,
  pointerOnRange,
  positionToOffset,
  rangeToOffsets,
} from "./positions.js";
export {
  findRecordPreview,
  getRecordPreviewRuns,
  type OffsetSpan,
  type PreviewRun,
  type RecordPreview,
} from "./recordPreview.js";
export {
  clearRecordPreview,
  recordPreviewHover,
  type RecordPreviewHoverOptions,
} from "./recordPreviewHover.js";
export {
  applyWorkspaceEdit,
  EditorLanguageService,
  toCodeMirrorChanges,
  type CodeMirrorChange,
  type CodeMirrorEditTarget,
} from "./service.js";
export {
  canRenameReference,
  findReferences,
  getDefinitionOffset,
  goToDefinition,
  goToNextReference,
  renameReference,
  type GedcomCommandTarget,
} from "./commands.js";
// DocumentSymbolKind is an enum, so a host comparing a symbol's kind needs the
// value and not only the type.
export { DocumentSymbolKind } from "@domorium/language-service";
export type {
  CreateDocumentOptions,
  DocumentLink,
  DocumentSymbol,
  GedcomDocument,
  Range,
  WorkspaceEdit,
} from "@domorium/language-service";
