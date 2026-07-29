export {
  createGedcomExtensions,
  getDiagnosticActions,
  getReferenceHighlightSpecs,
  semanticTokenTag,
  type GedcomEditorActions,
  type GedcomEditorOptions,
  type GedcomEditorSettings,
  type ReferenceHighlightSpec,
} from "./extensions";
export {
  offsetToPosition,
  positionToOffset,
  rangeToOffsets,
} from "./positions";
export {
  applyWorkspaceEdit,
  EditorLanguageService,
  toCodeMirrorChanges,
  type CodeMirrorChange,
  type CodeMirrorEditTarget,
} from "./service";
export {
  findReferences,
  getDefinitionOffset,
  goToDefinition,
  goToNextReference,
  renameReference,
  type GedcomCommandTarget,
} from "./commands";
export type { DocumentLink, Range, WorkspaceEdit } from "@gedcom/language-service";
