import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type { DocumentLink } from "@domorium/codemirror";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EditorWorkspace } from "@/components/EditorWorkspace";
import { ConfirmDialog, type Confirmation } from "@/components/ConfirmDialog";
import { ReplaceDocumentDialog } from "@/components/ReplaceDocumentDialog";
import { SiteHeader } from "@/components/SiteHeader";
import { ThemeProvider } from "@/components/ThemeProvider";
import { createAppContext, type AppContext } from "@/cordis/app";
import { CordisProvider, useCordis, useWorkspace } from "@/cordis/react";
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
import { createSingleFileGateway } from "@/workspace/singleFileGateway";
import {
  activeFile,
  isOpen,
  unsavedFiles,
  type OpenFile,
} from "@/workspace/workspace";

type PendingReplacement =
  { type: "file"; fileName: string; text: string } | { type: "demo" } | null;

/** The landing page's widget loads the editor with this, and takes the site's
 *  chrome on itself. */
const embedded = () =>
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("embed");

export function App() {
  const [app] = useState(createAppContext);

  return (
    <CordisProvider ctx={app.ctx}>
      <ThemeProvider>
        <TooltipProvider>
          <AppContent app={app} />
        </TooltipProvider>
      </ThemeProvider>
    </CordisProvider>
  );
}

function AppContent({ app }: { app: AppContext }) {
  const ctx = useCordis();
  const workspace = useWorkspace();
  const root = useRef<FileSystemDirectoryHandle | null>(null);
  const [demoText, setDemoText] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingReplacement, setPendingReplacement] =
    useState<PendingReplacement>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const file = activeFile(workspace);
  const modified = unsavedFiles(workspace).length > 0;

  /**
   * Opens a file on whichever surface claims it, and says so when none does. The
   * text is read here only for a surface that asked for it: a photograph read as
   * a string would come back corrupted.
   */
  const openOn = useCallback(
    async (path: string, read: (path: string) => Promise<string>) => {
      const surface = ctx.surfaces.claiming(path);
      if (!surface) {
        ctx.workspace.dispatch({ type: "file-unsupported", path });
        return;
      }
      ctx.workspace.dispatch({
        type: "file-opened",
        path,
        kind: surface.id,
        editable: surface.editable ?? false,
        text: surface.reads === "text" ? await read(path) : null,
      });
    },
    [ctx],
  );

  /** The demo, a single chosen file and a granted folder differ in the gateway only. */
  const openWorkspace = useCallback(
    async (next: FileGateway, path: string) => {
      await ctx.gateways.open(next);
      ctx.workspace.dispatch({
        type: "workspace-opened",
        name: next.name,
        writable: next.writable,
      });
      await openOn(path, (inner) => next.readText(inner));
    },
    [ctx, openOn],
  );

  useEffect(() => {
    let active = true;
    // The surfaces are plugged a microtask after the first render, and the
    // example is opened through the registry: it has to be filled first.
    app.ready
      .then(() => fetch(`${import.meta.env.BASE_URL}simpsons70.ged`))
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
  }, [app, openWorkspace]);

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
    const chosen = event.target.files?.[0];
    event.target.value = "";
    if (!chosen) {
      return;
    }
    try {
      setLoadError(null);
      requestReplacement({ type: "file", ...(await readGedcomFile(chosen)) });
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "The file could not be read.",
      );
    }
  };

  /** Reads the document from the surface now: it owns it, and a copy per keystroke costs. */
  const textOf = (open: OpenFile | null) =>
    ctx.surfaces.text() ?? open?.initialText ?? "";

  const files = () => ctx.get("files", false) ?? null;

  const report = (outcome: Awaited<ReturnType<typeof save>>) => {
    if (outcome.kind === "refused") {
      ctx.workspace.dispatch({ type: "notice", message: outcome.message });
      return;
    }
    if (outcome.kind !== "unchanged" && file) {
      ctx.workspace.dispatch({ type: "saved", path: file.path });
    }
    ctx.workspace.dispatch({
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
    report(await save(file, textOf(file), files()));
  };

  /**
   * Where the file the reader chooses lies inside the granted folder the session
   * goes on against it; where it does not, the copy went elsewhere and the
   * document in front is still the one it was.
   */
  const saveDocumentAs = async () => {
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
      ctx.workspace.dispatch({
        type: "notice",
        message: cause instanceof Error ? cause.message : "Nothing was written",
      });
      return;
    }

    try {
      await writeThroughHandle(chosen, text);
    } catch (cause) {
      ctx.workspace.dispatch({
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
    if (inside && files()) {
      ctx.workspace.dispatch({ type: "saved", path: file.path });
      await openOn(inside, async () => text);
      ctx.emit("files/changed");
      return;
    }
    ctx.workspace.dispatch({
      type: "notice",
      message: `${chosen.name} was written outside this folder, so ${file.name} is still unsaved`,
    });
  };

  const openFile = () => fileInputRef.current?.click();

  const saveAndClose = async (open: OpenFile, text: string) => {
    const outcome = await save(open, text, files());
    if (outcome.kind === "refused") {
      ctx.workspace.dispatch({ type: "notice", message: outcome.message });
      return;
    }
    ctx.workspace.dispatch({ type: "saved", path: open.path });
    ctx.workspace.dispatch({ type: "file-closed", path: open.path });
    ctx.workspace.dispatch({
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
      ctx.workspace.dispatch({ type: "file-closed", path });
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
        choose: () => ctx.workspace.dispatch({ type: "file-closed", path }),
      },
    });
  };

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
      root.current = handle;
      const gateway = createFolderGateway(handle);
      await ctx.gateways.open(gateway);
      ctx.workspace.dispatch({
        type: "workspace-opened",
        name: handle.name,
        writable: true,
      });
    } catch (cause) {
      // Closing the picker is not an error: nothing should change and nothing
      // should be said.
      if (cause instanceof DOMException && cause.name === "AbortError") {
        return;
      }
      ctx.workspace.dispatch({
        type: "notice",
        message:
          cause instanceof Error ? cause.message : "The folder was not granted",
      });
    }
  };

  /** A surface holds one document at a time: the tab being left has to leave its text. */
  const keepEditorText = () => {
    const text = ctx.surfaces.text();
    if (file?.editable && text !== undefined) {
      ctx.workspace.dispatch({ type: "text-kept", path: file.path, text });
    }
  };

  const chooseFile = async (path: string) => {
    const current = files();
    if (!current) {
      return;
    }
    keepEditorText();
    // An open file is brought forward rather than reread.
    if (isOpen(workspace, path)) {
      ctx.workspace.dispatch({ type: "file-activated", path });
      return;
    }
    try {
      await openOn(path, (inner) => current.readText(inner));
    } catch (cause) {
      ctx.workspace.dispatch({
        type: "notice",
        message:
          cause instanceof Error ? cause.message : "The file could not be read",
      });
    }
  };

  /** Where a link in the document leads: another file here, or off the page. */
  const openLink = (link: DocumentLink) => {
    const followed = followLink(link, {
      path: file?.path ?? "",
      hasWorkspace: files()?.folder === true,
    });
    if (followed.kind === "web") {
      window.open(followed.url, "_blank", "noopener,noreferrer");
    } else if (followed.kind === "file") {
      void chooseFile(followed.path);
    } else {
      ctx.workspace.dispatch({ type: "notice", message: followed.message });
    }
  };

  const download = () => {
    if (!file) {
      return;
    }
    downloadGedcom(textOf(file), file.name);
    ctx.workspace.dispatch({ type: "saved", path: file.path });
  };

  /**
   * A command outlives the render that defined it, so it is registered once and
   * reaches the current closure through a ref rather than being re-registered.
   */
  const latest = useRef({
    openFile,
    requestFolder,
    chooseFile,
    keepEditorText,
    closeTab,
    openLink,
  });
  useEffect(() => {
    latest.current = {
      openFile,
      requestFolder,
      chooseFile,
      keepEditorText,
      closeTab,
      openLink,
    };
  });

  useEffect(() => {
    const registered = [
      ctx.commands.register("workspace.openFile", () =>
        latest.current.openFile(),
      ),
      ctx.commands.register("workspace.openFolder", () =>
        latest.current.requestFolder(),
      ),
      ctx.commands.register(
        "workspace.chooseFile",
        (path) => void latest.current.chooseFile(path),
      ),
      ctx.commands.register("workspace.activateTab", (path) => {
        latest.current.keepEditorText();
        ctx.workspace.dispatch({ type: "file-activated", path });
      }),
      ctx.commands.register("workspace.closeTab", (path) =>
        latest.current.closeTab(path),
      ),
      ctx.commands.register("workspace.followLink", (link) =>
        latest.current.openLink(link),
      ),
    ];
    return () => {
      for (const dispose of registered) {
        void dispose();
      }
    };
  }, [ctx]);

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
        embedded={embedded()}
        onOpenFile={openFile}
        onDownload={download}
        onReset={() => requestReplacement({ type: "demo" })}
        onSave={() => void saveDocument()}
        onSaveAs={() => void saveDocumentAs()}
        saveAvailability={saveAvailability(
          file,
          files(),
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
            <EditorWorkspace />
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
