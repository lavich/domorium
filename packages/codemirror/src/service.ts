import type { Text } from "@codemirror/state";
import {
  GedcomLanguageService,
  type DocumentHighlight,
  type DocumentLink,
  type Position,
  type ReferenceOptions,
  type WorkspaceEdit,
} from "@gedcom/language-service";

import { toOffsets } from "./positions";

export interface CodeMirrorChange {
  from: number;
  to: number;
  insert: string;
}

export interface CodeMirrorEditTarget {
  state: { doc: Text };
  dispatch(spec: { changes: CodeMirrorChange[]; userEvent: string }): void;
}

export function toCodeMirrorChanges(
  document: Text,
  edit: WorkspaceEdit,
  version: number,
): CodeMirrorChange[] | null {
  if (edit.version !== version) {
    return null;
  }
  if (edit.edits.some(({ range }) =>
    !isValidPosition(document, range.start) ||
    !isValidPosition(document, range.end) ||
    comparePositions(range.start, range.end) > 0
  )) {
    return null;
  }
  const changes = edit.edits.map(({ range, newText }) => ({
    ...toOffsets(document, range),
    insert: newText,
  })).sort((left, right) => left.from - right.from || left.to - right.to);
  for (let index = 1; index < changes.length; index += 1) {
    if (changes[index - 1].to > changes[index].from) {
      return null;
    }
  }
  return changes;
}

export function applyWorkspaceEdit(
  target: CodeMirrorEditTarget,
  edit: WorkspaceEdit,
  version: number,
): boolean {
  const changes = toCodeMirrorChanges(target.state.doc, edit, version);
  if (!changes) {
    return false;
  }
  target.dispatch({ changes, userEvent: "input.gedcom" });
  return true;
}

export class EditorLanguageService {
  readonly service = new GedcomLanguageService();
  private text = "";
  private version = 0;

  update(text: string): GedcomLanguageService {
    if (text !== this.text) {
      this.text = text;
      this.version += 1;
      this.service.update(text, this.version);
    }
    return this.service;
  }

  clear(): void {
    this.text = "";
    this.version += 1;
    this.service.update("", this.version);
  }

  getVersion(): number {
    return this.version;
  }

  getReferences(position: Position, options: ReferenceOptions) {
    return this.service.getReferences(position, options);
  }

  getDocumentHighlights(position: Position): DocumentHighlight[] {
    return this.service.getDocumentHighlights(position);
  }

  getDocumentLinks(): DocumentLink[] {
    return this.service.getDocumentLinks();
  }
}

function isValidPosition(document: Text, position: Position): boolean {
  if (!Number.isInteger(position.line) || !Number.isInteger(position.character) ||
      position.line < 0 || position.character < 0 || position.line >= document.lines) {
    return false;
  }
  return position.character <= document.line(position.line + 1).length;
}

function comparePositions(left: Position, right: Position): number {
  return left.line - right.line || left.character - right.character;
}
