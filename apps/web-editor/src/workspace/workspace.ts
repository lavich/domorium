import { isGedcomFileName } from "../editor/documentSession";

export type FileKind = "gedcom" | "markdown" | "image" | "unsupported";

export interface OpenFile {
  /** Path from the root of the workspace: the identity of a tab. */
  path: string;
  name: string;
  kind: FileKind;
  /**
   * What the editor was created with, not what it holds now — the same bargain
   * the single-document session made, for the same reason: asking the editor for
   * a copy on every keystroke costs in proportion to the file.
   */
  initialText: string | null;
  modified: boolean;
  /** Changing this remounts the editor, which is how a reopened file is reread. */
  editorKey: number;
}

export interface Workspace {
  /** Null until a folder or a file is opened. */
  name: string | null;
  writable: boolean;
  files: OpenFile[];
  activePath: string | null;
  /** What the reader is told after a refusal; one line, cleared when acted on. */
  notice: string | null;
  nextEditorKey: number;
}

export type WorkspaceAction =
  | { type: "workspace-opened"; name: string; writable: boolean }
  | { type: "file-opened"; path: string; kind: FileKind; text: string | null }
  | { type: "file-activated"; path: string }
  | { type: "file-closed"; path: string }
  | { type: "edited"; path: string }
  | { type: "text-kept"; path: string; text: string }
  | { type: "saved"; path: string }
  | { type: "notice"; message: string | null };

export const emptyWorkspace: Workspace = {
  name: null,
  writable: false,
  files: [],
  activePath: null,
  notice: null,
  nextEditorKey: 0,
};

export function workspaceReducer(
  state: Workspace,
  action: WorkspaceAction,
): Workspace {
  switch (action.type) {
    case "workspace-opened":
      return {
        ...emptyWorkspace,
        name: action.name,
        writable: action.writable,
        nextEditorKey: state.nextEditorKey,
      };

    case "file-opened": {
      if (action.kind === "unsupported") {
        return {
          ...state,
          notice: `${nameOf(action.path)} is not a kind this editor can show`,
        };
      }
      const already = state.files.find((file) => file.path === action.path);
      if (already) {
        return { ...state, activePath: already.path, notice: null };
      }
      return {
        ...state,
        activePath: action.path,
        notice: null,
        nextEditorKey: state.nextEditorKey + 1,
        files: [
          ...state.files,
          {
            path: action.path,
            name: nameOf(action.path),
            kind: action.kind,
            initialText: action.text,
            modified: false,
            editorKey: state.nextEditorKey,
          },
        ],
      };
    }

    case "file-activated":
      return state.files.some((file) => file.path === action.path)
        ? { ...state, activePath: action.path, notice: null }
        : state;

    case "file-closed": {
      const files = state.files.filter((file) => file.path !== action.path);
      if (files.length === state.files.length) {
        return state;
      }
      return {
        ...state,
        files,
        activePath:
          state.activePath === action.path
            ? (files.at(-1)?.path ?? null)
            : state.activePath,
      };
    }

    // A preview carries nothing to save, so it never becomes modified — which is
    // what keeps "unsaved work" a question only a GEDCOM tab can answer.
    case "edited":
      return mapFile(state, action.path, (file) =>
        file.kind !== "gedcom" || file.modified
          ? file
          : { ...file, modified: true },
      );

    // The editor holds one document at a time, so the text of a tab being left has
    // to be kept on the file itself — otherwise it comes back as the file on disk
    // and the edits are gone without a word.
    case "text-kept":
      return mapFile(state, action.path, (file) =>
        file.kind === "gedcom" && file.initialText !== action.text
          ? { ...file, initialText: action.text }
          : file,
      );

    case "saved":
      return mapFile(state, action.path, (file) =>
        file.modified ? { ...file, modified: false } : file,
      );

    case "notice":
      return state.notice === action.message
        ? state
        : { ...state, notice: action.message };
  }
}

export function activeFile(state: Workspace): OpenFile | null {
  return state.files.find((file) => file.path === state.activePath) ?? null;
}

export function isOpen(state: Workspace, path: string): boolean {
  return state.files.some((file) => file.path === path);
}

export function unsavedFiles(state: Workspace): OpenFile[] {
  return state.files.filter((file) => file.modified);
}

/**
 * Which view a file calls for. The extension is all there is to go by before the
 * file is read, and reading a folder's every file to sniff its bytes would cost
 * the reader a folder walk they did not ask for.
 */
export function fileKindOf(path: string): FileKind {
  const name = nameOf(path).toLowerCase();
  if (isGedcomFileName(name)) {
    return "gedcom";
  }
  if (/\.(md|markdown)$/.test(name)) {
    return "markdown";
  }
  if (/\.(png|jpe?g|gif|webp|avif|bmp|svg)$/.test(name)) {
    return "image";
  }
  return "unsupported";
}

export function nameOf(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

function mapFile(
  state: Workspace,
  path: string,
  change: (file: OpenFile) => OpenFile,
): Workspace {
  let touched = false;
  const files = state.files.map((file) => {
    if (file.path !== path) {
      return file;
    }
    const next = change(file);
    touched = next !== file;
    return next;
  });
  return touched ? { ...state, files } : state;
}
