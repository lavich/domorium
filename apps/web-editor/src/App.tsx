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
import {
  createDemoSession,
  documentSessionReducer,
  isModified,
} from "@/editor/documentSession";
import { downloadGedcom, readGedcomFile } from "@/editor/fileActions";
import type { GedcomEditorHandle, WebDiagnostic } from "@/editor/types";

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
  const [session, dispatch] = useReducer(
    documentSessionReducer,
    "",
    createDemoSession,
  );
  const [demoText, setDemoText] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<WebDiagnostic[]>([]);
  const [pendingReplacement, setPendingReplacement] =
    useState<PendingReplacement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<GedcomEditorHandle>(null);
  const modified = isModified(session);

  useEffect(() => {
    let active = true;
    fetch(`${import.meta.env.BASE_URL}simpsons55.ged`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Example request failed: ${response.status}`);
        }
        return response.text();
      })
      .then((text) => {
        if (!active) {
          return;
        }
        setDemoText(text);
        dispatch({ type: "reset-demo", text });
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
  }, []);

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
        dispatch({
          type: "file-loaded",
          fileName: replacement.fileName,
          text: replacement.text,
        });
      } else {
        dispatch({ type: "reset-demo", text: demoText });
      }
      setDiagnostics([]);
    },
    [demoText],
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
    downloadGedcom(session.text, session.fileName);
    dispatch({ type: "downloaded" });
  };

  return (
    <main className="flex h-svh flex-col overflow-hidden bg-background text-foreground">
      <SiteHeader />
      <input
        ref={fileInputRef}
        className="sr-only"
        type="file"
        accept=".ged,.gedcom"
        aria-label="Open GEDCOM file"
        onChange={handleFile}
      />
      <div className="mx-auto flex min-h-0 w-full max-w-[110rem] flex-1 overflow-hidden p-4 lg:p-6">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
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
              session={session}
              modified={modified}
              diagnostics={diagnostics}
              theme={resolvedTheme}
              editorRef={editorRef}
              onChange={(text) => dispatch({ type: "edit", text })}
              onDiagnosticsChange={setDiagnostics}
              onOpenFile={openFile}
              onDownload={download}
              onReset={() => requestReplacement({ type: "demo" })}
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
