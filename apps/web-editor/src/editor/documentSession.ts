export interface DocumentSession {
  editorKey: number;
  source: "demo" | "file";
  fileName: string;
  text: string;
  downloadedText: string;
}

export type DocumentAction =
  | { type: "edit"; text: string }
  | { type: "file-loaded"; fileName: string; text: string }
  | { type: "reset-demo"; text: string }
  | { type: "downloaded" };

export function createDemoSession(text: string): DocumentSession {
  return {
    editorKey: 0,
    source: "demo",
    fileName: "example.ged",
    text,
    downloadedText: text,
  };
}

export function documentSessionReducer(
  state: DocumentSession,
  action: DocumentAction,
): DocumentSession {
  switch (action.type) {
    case "edit":
      return { ...state, text: action.text };
    case "file-loaded":
      return {
        editorKey: state.editorKey + 1,
        source: "file",
        fileName: action.fileName,
        text: action.text,
        downloadedText: action.text,
      };
    case "reset-demo":
      return {
        editorKey: state.editorKey + 1,
        source: "demo",
        fileName: "example.ged",
        text: action.text,
        downloadedText: action.text,
      };
    case "downloaded":
      return { ...state, downloadedText: state.text };
  }
}

export function isModified(session: DocumentSession): boolean {
  return session.text !== session.downloadedText;
}

export function isGedcomFileName(name: string): boolean {
  return /\.(ged|gedcom)$/i.test(name);
}

export function downloadName(name: string): string {
  return name.replace(/\.(ged|gedcom)$/i, "-edited.$1");
}
