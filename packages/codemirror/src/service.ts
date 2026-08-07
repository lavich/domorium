import type { Text } from "@codemirror/state";
import {
  GedcomLanguageService,
  type DocumentHighlight,
  type DocumentLink,
  type Position,
  type ReferenceOptions,
  type WorkspaceEdit,
} from "@domorium/language-service";

import { rangeToOffsets } from "./positions.js";

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
  if (
    edit.edits.some(
      ({ range }) =>
        !isValidPosition(document, range.start) ||
        !isValidPosition(document, range.end) ||
        comparePositions(range.start, range.end) > 0,
    )
  ) {
    return null;
  }
  const changes = edit.edits
    .map(({ range, newText }) => ({
      ...rangeToOffsets(document, range),
      insert: newText,
    }))
    .sort((left, right) => left.from - right.from || left.to - right.to);
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
  private doc: Text | undefined;
  private version = 0;

  /**
   * Prefer passing the editor's `state.doc`. Hover, completion, highlighting
   * and folding all update before answering, and almost always with a document
   * that has not changed — reading it out as a string to find that out costs
   * the whole document every time. CodeMirror's Text is immutable, so identity
   * settles it without touching the content. A string is still accepted, and
   * content is still compared when a different Text arrives, so a document
   * rebuilt with the same content does not look like an edit.
   */
  update(source: string | Text): GedcomLanguageService {
    if (typeof source !== "string") {
      if (source === this.doc) {
        return this.service;
      }
      this.doc = source;
      source = source.toString();
    } else {
      this.doc = undefined;
    }

    if (source !== this.text) {
      this.text = source;
      this.version += 1;
      this.service.update(source, this.version);
    }
    return this.service;
  }

  /**
   * The service as it already stands, or undefined when the document has
   * moved on since the last parse.
   *
   * For callers that run on the input path and cannot afford to force a
   * reparse. The fold gutter is one: it asks for every visible line on every
   * view update, so calling `update` there put a full reparse back on every
   * keystroke no matter what the decoration plugins did. Answering from a
   * stale parse would put the markers on the wrong lines, so it declines to
   * answer until the parse catches up.
   */
  current(doc: Text): GedcomLanguageService | undefined {
    return doc === this.doc ? this.service : undefined;
  }

  clear(): void {
    this.text = "";
    this.doc = undefined;
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

  prepareRename(position: Position) {
    return this.service.prepareRename(position);
  }
}

function isValidPosition(document: Text, position: Position): boolean {
  if (
    !Number.isInteger(position.line) ||
    !Number.isInteger(position.character) ||
    position.line < 0 ||
    position.character < 0 ||
    position.line >= document.lines
  ) {
    return false;
  }
  return position.character <= document.line(position.line + 1).length;
}

function comparePositions(left: Position, right: Position): number {
  return left.line - right.line || left.character - right.character;
}
