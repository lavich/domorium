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
import { ReplaceDocumentDialog } from "@/components/ReplaceDocumentDialog";
import { SiteHeader } from "@/components/SiteHeader";
import { ThemeProvider, useTheme } from "@/components/ThemeProvider";
import { downloadGedcom, readGedcomFile } from "@/editor/fileActions";
import type { FileGateway } from "@/workspace/fileGateway";
import { createMemoryGateway } from "@/workspace/memoryGateway";
import { createSingleFileGateway } from "@/workspace/singleFileGateway";
import {
  activeFile,
  emptyWorkspace,
  fileKindOf,
  unsavedFiles,
  workspaceReducer,
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
            { name: "Example", writable: false },
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
            { name: "Example", writable: false },
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

  const openFile = () => fileInputRef.current?.click();
  const download = () => {
    if (!file) {
      return;
    }
    // Read now rather than track: the editor owns the document.
    downloadGedcom(
      editorRef.current?.getText() ?? file.initialText ?? "",
      file.name,
    );
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
      } else {
        download();
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
              onOpenFile={openFile}
              onDownload={download}
              onActivate={(path) => dispatch({ type: "file-activated", path })}
              onClose={(path) => dispatch({ type: "file-closed", path })}
              readBytes={(path) =>
                gateway.current
                  ? gateway.current.readBytes(path)
                  : Promise.reject(new Error("No workspace is open"))
              }
            />
          )}
        </div>
      </div>
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
