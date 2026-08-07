export interface DocumentSession {
  editorKey: number;
  source: "demo" | "file";
  fileName: string;
  /**
   * What the editor was created with, not what it holds now. The editor owns
   * the current document; asking it for a copy on every keystroke cost in
   * proportion to the file.
   */
  initialText: string;
  modified: boolean;
}

export type DocumentAction =
  | { type: "edit" }
  | { type: "file-loaded"; fileName: string; text: string }
  | { type: "reset-demo"; text: string }
  | { type: "downloaded" };

export function createDemoSession(text: string): DocumentSession {
  return {
    editorKey: 0,
    source: "demo",
    fileName: "example.ged",
    initialText: text,
    modified: false,
  };
}

export function documentSessionReducer(
  state: DocumentSession,
  action: DocumentAction,
): DocumentSession {
  switch (action.type) {
    case "edit":
      return state.modified ? state : { ...state, modified: true };
    case "file-loaded":
      return {
        editorKey: state.editorKey + 1,
        source: "file",
        fileName: action.fileName,
        initialText: action.text,
        modified: false,
      };
    case "reset-demo":
      return {
        editorKey: state.editorKey + 1,
        source: "demo",
        fileName: "example.ged",
        initialText: action.text,
        modified: false,
      };
    case "downloaded":
      return state.modified ? { ...state, modified: false } : state;
  }
}

/**
 * True once the document has been edited since it was opened or saved.
 *
 * This used to compare the current text with the saved text, which is exact
 * but meant holding two copies of the document and comparing them on every
 * render. An edit that is then undone therefore now leaves the document
 * marked as modified.
 */
export function isModified(session: DocumentSession): boolean {
  return session.modified;
}

export function isGedcomFileName(name: string): boolean {
  return /\.(ged|gedcom)$/i.test(name);
}

export function downloadName(name: string): string {
  return name.replace(/\.(ged|gedcom)$/i, "-edited.$1");
}
