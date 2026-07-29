export { gedcomLanguage, gedcomSyntaxHighlighting, classifyGedcomLine } from "./language";
export {
  createGedcomExtensions,
  getDiagnosticActions,
  getReferenceHighlightSpecs,
  type GedcomEditorActions,
  type GedcomEditorOptions,
  type GedcomEditorSettings,
  type ReferenceHighlightSpec,
} from "./extensions";
export { toOffset, toOffsets, toPosition } from "./positions";
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
