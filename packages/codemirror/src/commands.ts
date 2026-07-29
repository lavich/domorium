import { EditorState, type TransactionSpec } from "@codemirror/state";
import type { Range } from "@gedcom/language-service";

import { toOffset, toPosition } from "./positions";
import { EditorLanguageService, toCodeMirrorChanges } from "./service";

export interface GedcomCommandTarget {
  readonly state: EditorState;
  dispatch(spec: TransactionSpec): void;
}

export function findReferences(
  state: EditorState,
  language: EditorLanguageService,
): Range[] {
  return language.update(state.sliceDoc()).getReferences(
    toPosition(state.doc, state.selection.main.head),
    { includeDeclaration: true },
  );
}

export function getDefinitionOffset(
  state: EditorState,
  language: EditorLanguageService,
): number | null {
  const definition = language.update(state.sliceDoc()).getDefinitionRanges(
    toPosition(state.doc, state.selection.main.head),
  )[0];
  return definition ? toOffset(state.doc, definition.start) : null;
}

export function goToDefinition(
  target: GedcomCommandTarget,
  language: EditorLanguageService,
): boolean {
  const offset = getDefinitionOffset(target.state, language);
  if (offset === null) {
    return false;
  }
  target.dispatch({ selection: { anchor: offset }, scrollIntoView: true });
  return true;
}

export function goToNextReference(
  target: GedcomCommandTarget,
  language: EditorLanguageService,
): number {
  const ranges = findReferences(target.state, language);
  if (ranges.length === 0) {
    return 0;
  }
  const current = target.state.selection.main.head;
  const offsets = ranges.map((range) => toOffset(target.state.doc, range.start));
  const offset = offsets.find((candidate) => candidate > current) ?? offsets[0];
  target.dispatch({ selection: { anchor: offset }, scrollIntoView: true });
  return ranges.length;
}

export function renameReference(
  target: GedcomCommandTarget,
  language: EditorLanguageService,
  newName: string,
): boolean {
  language.update(target.state.sliceDoc());
  const result = language.service.rename(
    toPosition(target.state.doc, target.state.selection.main.head),
    newName,
    language.getVersion(),
  );
  if (!result.ok) {
    return false;
  }
  const changes = toCodeMirrorChanges(
    target.state.doc,
    result.edit,
    language.getVersion(),
  );
  if (!changes) {
    return false;
  }
  target.dispatch({ changes, userEvent: "input.gedcom" });
  return true;
}
