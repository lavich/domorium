export {
  createGedcomExtensions,
  createStandaloneEditorExtensions,
  getDiagnosticActions,
  getReferenceHighlightSpecs,
  semanticTokenTag,
  SETTLE_DELAY_MS,
  type GedcomEditorActions,
  type GedcomEditorOptions,
  type GedcomEditorSettings,
  type ReferenceHighlightSpec,
} from "./extensions.js";
export { hoveredPointerField, setHoveredPointer } from "./pointerDecoration.js";
export {
  offsetToPosition,
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
  DocumentLink,
  Range,
  WorkspaceEdit,
} from "@domorium/language-service";
