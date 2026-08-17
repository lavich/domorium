import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EditorWorkspace } from "@/components/EditorWorkspace";
import { ConfirmDialog, type Confirmation } from "@/components/ConfirmDialog";
import { ReplaceDocumentDialog } from "@/components/ReplaceDocumentDialog";
import { SiteHeader } from "@/components/SiteHeader";
import { ThemeProvider, useTheme } from "@/components/ThemeProvider";
import { downloadGedcom, readGedcomFile } from "@/editor/fileActions";
import type { FileGateway } from "@/workspace/fileGateway";
import {
  createFolderGateway,
  pathWithin,
  pickFolder,
  pickSaveFile,
  savePickerAvailable,
  writeThroughHandle,
} from "@/workspace/folderGateway";
import { createMemoryGateway } from "@/workspace/memoryGateway";
import { followLink } from "@/workspace/followLink";
import { save, saveAvailability } from "@/workspace/save";
import { detectWorkspaceSupport } from "@/workspace/support";
import { toggled, treeRows, type TreeNode } from "@/workspace/tree";
import { createSingleFileGateway } from "@/workspace/singleFileGateway";
import {
  activeFile,
  emptyWorkspace,
  fileKindOf,
  isOpen,
  unsavedFiles,
  workspaceReducer,
  type OpenFile,
} from "@/workspace/workspace";
import type {
  GedcomEditorHandle,
  WebDiagnostic,
  WebEditorStatus,
} from "@/editor/types";

type PendingReplacement =
  { type: "file"; fileName: string; text: string } | { type: "demo" } | null;

export function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <AppContent />
      </TooltipProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const { resolvedTheme } = useTheme();
  const [workspace, dispatch] = useReducer(workspaceReducer, emptyWorkspace);
  const gateway = useRef<FileGateway | null>(null);
  const root = useRef<FileSystemDirectoryHandle | null>(null);
  const support = useRef(detectWorkspaceSupport()).current;
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [rows, setRows] = useState<TreeNode[]>([]);
  const [demoText, setDemoText] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<WebDiagnostic[]>([]);
  const [status, setStatus] = useState<WebEditorStatus>({
    line: 0,
    character: 0,
    resolution: undefined,
  });
  const [pendingReplacement, setPendingReplacement] =
    useState<PendingReplacement>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<GedcomEditorHandle>(null);
  const file = activeFile(workspace);
  const modified = unsavedFiles(workspace).length > 0;

  /**
   * Opening a workspace is opening a gateway: the demo, a single chosen file and
   * a granted folder differ in which one they are and in nothing else.
   */
  const openWorkspace = useCallback(async (next: FileGateway, path: string) => {
    gateway.current = next;
    dispatch({
      type: "workspace-opened",
      name: next.name,
      writable: next.writable,
    });
    dispatch({
      type: "file-opened",
      path,
      kind: fileKindOf(path),
      text: fileKindOf(path) === "image" ? null : await next.readText(path),
    });
    setDiagnostics([]);
  }, []);

  useEffect(() => {
    let active = true;
    fetch(`${import.meta.env.BASE_URL}simpsons70.ged`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Example request failed: ${response.status}`);
        }
        return response.text();
      })
      .then(async (text) => {
        if (!active) {
          return;
        }
        setDemoText(text);
        await openWorkspace(
          createMemoryGateway(
            { "example.ged": text },
            { name: "Example", writable: false, folder: false },
          ),
          "example.ged",
        );
      })
      .catch(() => {
        if (active) {
          setLoadError(
            "The example could not be loaded. You can still open your own GEDCOM file.",
          );
        }
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [openWorkspace]);

  useEffect(() => {
    const current = gateway.current;
    if (!current) {
      setRows([]);
      return;
    }
    let active = true;
    treeRows(current, expanded)
      .then((next) => active && setRows(next))
      .catch((cause: unknown) =>
        active
          ? dispatch({
              type: "notice",
              message:
                cause instanceof Error
                  ? cause.message
                  : "The folder could not be read",
            })
          : undefined,
      );
    return () => {
      active = false;
    };
  }, [expanded, workspace.name]);

  useEffect(() => {
    if (!modified) {
      return;
    }
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [modified]);

  const applyReplacement = useCallback(
    (replacement: Exclude<PendingReplacement, null>) => {
      if (replacement.type === "file") {
        void openWorkspace(
          createSingleFileGateway(replacement.fileName, replacement.text),
          replacement.fileName,
        );
      } else {
        void openWorkspace(
          createMemoryGateway(
            { "example.ged": demoText },
            { name: "Example", writable: false, folder: false },
          ),
          "example.ged",
        );
      }
    },
    [demoText, openWorkspace],
  );

  const requestReplacement = useCallback(
    (replacement: Exclude<PendingReplacement, null>) => {
      if (modified) {
        setPendingReplacement(replacement);
      } else {
        applyReplacement(replacement);
      }
    },
    [applyReplacement, modified],
  );

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    try {
      setLoadError(null);
      requestReplacement({ type: "file", ...(await readGedcomFile(file)) });
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "The file could not be read.",
      );
    }
  };

  /** Reads the document from the editor now: it owns it, and a copy per keystroke costs. */
  const textOf = (open: typeof file) =>
    editorRef.current?.getText() ?? open?.initialText ?? "";

  const report = (outcome: Awaited<ReturnType<typeof save>>) => {
    if (outcome.kind === "refused") {
      dispatch({ type: "notice", message: outcome.message });
      return;
    }
    if (outcome.kind !== "unchanged" && file) {
      dispatch({ type: "saved", path: file.path });
    }
    dispatch({
      type: "notice",
      message:
        outcome.kind === "downloaded"
          ? `A copy of ${outcome.name} was downloaded; the original was not touched`
          : null,
    });
  };

  const saveDocument = async () => {
    if (!file) {
      return;
    }
    report(await save(file, textOf(file), gateway.current));
  };

  /**
   * The browser asks where and under what name, and warns about replacing
   * something itself. Where the file the reader chooses is inside the folder they
   * granted, the session goes on against it; where it is not, the copy simply
   * went elsewhere and the document in front is still the one it was.
   */
  const saveDocumentAs = async () => {
    const current = gateway.current;
    if (!file) {
      return;
    }
    const text = textOf(file);
    let chosen: FileSystemFileHandle;
    try {
      chosen = await pickSaveFile(file.name);
    } catch (cause) {
      // Dismissing the dialog is not an error: nothing written, nothing said.
      if (cause instanceof DOMException && cause.name === "AbortError") {
        return;
      }
      dispatch({
        type: "notice",
        message: cause instanceof Error ? cause.message : "Nothing was written",
      });
      return;
    }

    try {
      await writeThroughHandle(chosen, text);
    } catch (cause) {
      dispatch({
        type: "notice",
        message:
          cause instanceof Error
            ? cause.message
            : `${chosen.name} could not be written`,
      });
      return;
    }

    // Only a granted folder can hold the file the session goes on against.
    const inside = root.current ? await pathWithin(root.current, chosen) : null;
    if (inside && current) {
      dispatch({ type: "saved", path: file.path });
      dispatch({
        type: "file-opened",
        path: inside,
        kind: fileKindOf(inside),
        text,
      });
      setRows(await treeRows(current, expanded));
      return;
    }
    dispatch({
      type: "notice",
      message: `${chosen.name} was written outside this folder, so ${file.name} is still unsaved`,
    });
  };

  const openFile = () => fileInputRef.current?.click();

  /** Saves the tab that is about to close, and keeps it open where the save is refused. */
  const saveAndClose = async (open: OpenFile, text: string) => {
    const outcome = await save(open, text, gateway.current);
    if (outcome.kind === "refused") {
      dispatch({ type: "notice", message: outcome.message });
      return;
    }
    dispatch({ type: "saved", path: open.path });
    dispatch({ type: "file-closed", path: open.path });
    dispatch({
      type: "notice",
      message:
        outcome.kind === "downloaded"
          ? `A copy of ${outcome.name} was downloaded; the original was not touched`
          : null,
    });
  };

  const closeTab = (path: string) => {
    const open = workspace.files.find((tab) => tab.path === path);
    if (!open) {
      return;
    }
    if (!open.modified) {
      keepEditorText();
      dispatch({ type: "file-closed", path });
      return;
    }
    // Read the text now: after the dialog the editor may hold another document.
    const text = path === file?.path ? textOf(open) : (open.initialText ?? "");
    setConfirmation({
      title: `${open.name} has unsaved changes`,
      description:
        "Save it before closing, discard what you typed, or keep the tab open.",
      action: "Save and close",
      confirm: () => void saveAndClose(open, text),
      alternative: {
        action: "Discard",
        choose: () => dispatch({ type: "file-closed", path }),
      },
    });
  };

  /** A granted folder replaces the workspace, so everything unsaved in it goes. */
  const requestFolder = () => {
    const unsaved = unsavedFiles(workspace);
    if (unsaved.length === 0) {
      void openFolder();
      return;
    }
    setConfirmation({
      title: "Unsaved changes",
      description: `${unsaved.map((open) => open.name).join(", ")} ${
        unsaved.length === 1 ? "has" : "have"
      } changes that were never written, and opening another folder discards them.`,
      action: "Open another folder",
      confirm: () => void openFolder(),
    });
  };

  /**
   * Only ever from something the reader did: the browser refuses a picker it was
   * not asked for, and a page that asks on load is one nobody trusts.
   */
  const openFolder = async () => {
    try {
      const handle = await pickFolder();
      setExpanded(new Set());
      root.current = handle;
      gateway.current = createFolderGateway(handle);
      dispatch({
        type: "workspace-opened",
        name: handle.name,
        writable: true,
      });
      setRows(await treeRows(gateway.current, new Set()));
    } catch (cause) {
      // Closing the picker is not an error: nothing should change and nothing
      // should be said.
      if (cause instanceof DOMException && cause.name === "AbortError") {
        return;
      }
      dispatch({
        type: "notice",
        message:
          cause instanceof Error ? cause.message : "The folder was not granted",
      });
    }
  };

  /**
   * The editor is one document at a time, so what the reader typed into the tab
   * being left is kept on the file before another takes its place.
   */
  const keepEditorText = () => {
    if (file?.kind === "gedcom" && editorRef.current) {
      dispatch({
        type: "text-kept",
        path: file.path,
        text: editorRef.current.getText(),
      });
    }
  };

  const chooseFile = async (path: string) => {
    const current = gateway.current;
    if (!current) {
      return;
    }
    keepEditorText();
    const kind = fileKindOf(path);
    if (isOpen(workspace, path) || kind === "unsupported") {
      dispatch({ type: "file-opened", path, kind, text: null });
      return;
    }
    try {
      dispatch({
        type: "file-opened",
        path,
        kind,
        text: kind === "image" ? null : await current.readText(path),
      });
    } catch (cause) {
      dispatch({
        type: "notice",
        message:
          cause instanceof Error ? cause.message : "The file could not be read",
      });
    }
  };
  const download = () => {
    if (!file) {
      return;
    }
    downloadGedcom(textOf(file), file.name);
    dispatch({ type: "saved", path: file.path });
  };

  // The File menu names these, so they have to work. Ctrl/Cmd-S also keeps the
  // browser from offering to save the page, which is never what is wanted here.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key !== "o" && key !== "s") {
        return;
      }
      event.preventDefault();
      if (key === "o") {
        openFile();
      } else if (event.shiftKey) {
        void saveDocumentAs();
      } else {
        void saveDocument();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <main className="flex h-svh flex-col overflow-hidden bg-background text-foreground">
      <SiteHeader
        onOpenFile={openFile}
        onDownload={download}
        onReset={() => requestReplacement({ type: "demo" })}
        onSave={() => void saveDocument()}
        onSaveAs={() => void saveDocumentAs()}
        saveAvailability={saveAvailability(
          file,
          gateway.current,
          savePickerAvailable(),
        )}
      />
      <input
        ref={fileInputRef}
        className="sr-only"
        type="file"
        accept=".ged,.gedcom"
        aria-label="Open GEDCOM file"
        onChange={handleFile}
      />
      <div className="flex min-h-0 w-full flex-1 overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {loadError ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to open GEDCOM</AlertTitle>
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          ) : null}
          {loading ? (
            <Skeleton
              className="min-h-0 flex-1"
              aria-label="Loading GEDCOM example"
            />
          ) : (
            <EditorWorkspace
              workspace={workspace}
              diagnostics={diagnostics}
              status={status}
              theme={resolvedTheme}
              editorRef={editorRef}
              onChange={() =>
                file ? dispatch({ type: "edited", path: file.path }) : undefined
              }
              onDiagnosticsChange={setDiagnostics}
              onStatusChange={setStatus}
              onFollowLink={(link) => {
                const followed = followLink(link, {
                  path: file?.path ?? "",
                  hasWorkspace: gateway.current?.folder === true,
                });
                if (followed.kind === "web") {
                  window.open(followed.url, "_blank", "noopener,noreferrer");
                } else if (followed.kind === "file") {
                  void chooseFile(followed.path);
                } else {
                  dispatch({ type: "notice", message: followed.message });
                }
              }}
              onOpenFile={openFile}
              onOpenFolder={requestFolder}
              explorerRows={rows}
              unavailableReason={support.reason}
              onToggleDirectory={(path) =>
                setExpanded((open) => toggled(open, path))
              }
              onChooseFile={(path) => void chooseFile(path)}
              onActivate={(path) => {
                keepEditorText();
                dispatch({ type: "file-activated", path });
              }}
              onClose={closeTab}
              readBytes={(path) =>
                gateway.current
                  ? gateway.current.readBytes(path)
                  : Promise.reject(new Error("No workspace is open"))
              }
            />
          )}
        </div>
      </div>
      <ConfirmDialog
        confirmation={confirmation}
        onCancel={() => setConfirmation(null)}
      />
      <ReplaceDocumentDialog
        open={pendingReplacement !== null}
        onCancel={() => setPendingReplacement(null)}
        onConfirm={() => {
          if (pendingReplacement) {
            applyReplacement(pendingReplacement);
          }
          setPendingReplacement(null);
        }}
      />
    </main>
  );
}
