export {
  createGedcomExtensions,
  createStandaloneEditorExtensions,
  getDiagnosticActions,
  getReferenceHighlightSpecs,
  semanticTokenTag,
  type GedcomEditorActions,
  type GedcomEditorOptions,
  type GedcomEditorSettings,
  type ReferenceHighlightSpec,
} from "./extensions.js";
export {
  offsetToPosition,
  positionToOffset,
  rangeToOffsets,
} from "./positions.js";
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
export type { DocumentLink, Range, WorkspaceEdit } from "@gedcom/language-service";
