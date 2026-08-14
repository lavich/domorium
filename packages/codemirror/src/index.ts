export {
  createGedcomExtensions,
  createStandaloneEditorExtensions,
  getDiagnosticActions,
  getDocumentLinkSpecs,
  getReferenceHighlightSpecs,
  semanticTokenTag,
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
} from "./pointerDecoration.js";
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
export type {
  CreateDocumentOptions,
  DocumentLink,
  GedcomDocument,
  Range,
  WorkspaceEdit,
} from "@domorium/language-service";
