import { useEffect, useState, type RefObject } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ActivityRail } from "./ActivityRail";
import { EditorTabs } from "./EditorTabs";
import { ExplorerPanel } from "./ExplorerPanel";
import { ProblemsPanel } from "./ProblemsPanel";
import { StatusBar } from "./StatusBar";
import { ImagePreview, MarkdownPreview } from "./FilePreview";
import type { DocumentLink } from "@domorium/codemirror";

import { GedcomEditor } from "@/editor/GedcomEditor";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { activeFile, type Workspace } from "@/workspace/workspace";
import type { TreeNode } from "@/workspace/tree";
import type {
  GedcomEditorHandle,
  WebDiagnostic,
  WebEditorStatus,
  WebTheme,
} from "@/editor/types";

export function EditorWorkspace({
  workspace,
  diagnostics,
  status,
  theme,
  editorRef,
  onChange,
  onDiagnosticsChange,
  onStatusChange,
  onFollowLink,
  onOpenFile,
  onOpenFolder,
  onActivate,
  onClose,
  readBytes,
  explorerRows,
  unavailableReason,
  onToggleDirectory,
  onChooseFile,
}: {
  workspace: Workspace;
  diagnostics: WebDiagnostic[];
  status: WebEditorStatus;
  theme: WebTheme;
  editorRef: RefObject<GedcomEditorHandle | null>;
  onChange(): void;
  onDiagnosticsChange(diagnostics: WebDiagnostic[]): void;
  onStatusChange(status: WebEditorStatus): void;
  onFollowLink(link: DocumentLink): void;
  onOpenFile(): void;
  onOpenFolder(): void;
  onActivate(path: string): void;
  onClose(path: string): void;
  readBytes(path: string): Promise<Blob>;
  explorerRows: TreeNode[];
  unavailableReason: string | null;
  onToggleDirectory(path: string): void;
  onChooseFile(path: string): void;
}) {
  const file = activeFile(workspace);
  const wideEnoughForPanels = useMediaQuery("(min-width: 768px)");
  const [explorerOpen, setExplorerOpen] = useState(true);
  const [problemsOpen, setProblemsOpen] = useState(true);
  const selectDiagnostic = (diagnostic: WebDiagnostic) =>
    editorRef.current?.focusDiagnostic(diagnostic);

  // One surface per kind of file, chosen by the tab in front. A preview is not
  // the editor with editing turned off: it holds no document and no dirty flag,
  // which is what keeps "unsaved" a question only a GEDCOM tab can answer.
  const surface = () => {
    if (!file) {
      return (
        <Empty className="h-full">
          <EmptyTitle>Nothing open</EmptyTitle>
          <EmptyDescription>
            Open a GEDCOM file to read and edit it.
          </EmptyDescription>
        </Empty>
      );
    }
    if (file.kind === "markdown") {
      return <MarkdownPreview name={file.name} text={file.initialText ?? ""} />;
    }
    if (file.kind === "image") {
      return (
        <ImagePreview name={file.name} path={file.path} load={readBytes} />
      );
    }
    return (
      <GedcomEditor
        ref={editorRef}
        editorKey={file.editorKey}
        initialText={file.initialText ?? ""}
        theme={theme}
        onChange={onChange}
        onDiagnosticsChange={onDiagnosticsChange}
        onStatusChange={onStatusChange}
        onFollowLink={onFollowLink}
      />
    );
  };

  // h-full, not only flex-1: ResizablePanel is not a flex container, so a
  // percentage is what gives the editor a definite height to scroll inside.
  const pane = (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <EditorTabs
        files={workspace.files}
        activePath={workspace.activePath}
        onActivate={onActivate}
        onClose={onClose}
      />
      <div className="min-h-0 flex-1">{surface()}</div>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1">
        <ActivityRail
          explorerOpen={explorerOpen}
          problemsOpen={problemsOpen}
          problemCount={diagnostics.length}
          onToggleExplorer={() => setExplorerOpen((open) => !open)}
          onToggleProblems={() => setProblemsOpen((open) => !open)}
          onOpenSearch={() => editorRef.current?.openSearch()}
        />
        {wideEnoughForPanels && explorerOpen ? (
          <ExplorerPanel
            workspaceName={workspace.name}
            rows={explorerRows}
            activePath={workspace.activePath}
            unavailableReason={unavailableReason}
            notice={workspace.notice}
            onOpenFolder={onOpenFolder}
            onOpenFile={onOpenFile}
            onToggleDirectory={onToggleDirectory}
            onChooseFile={onChooseFile}
          />
        ) : null}
        {wideEnoughForPanels && problemsOpen ? (
          <ResizablePanelGroup orientation="horizontal">
            <ResizablePanel defaultSize={72} minSize={40}>
              {pane}
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={28} minSize={18}>
              <aside aria-label="GEDCOM problems" className="h-full border-l">
                <ProblemsPanel
                  diagnostics={diagnostics}
                  onSelect={selectDiagnostic}
                />
              </aside>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          pane
        )}
      </div>
      <StatusBar
        resolution={status.resolution}
        line={status.line}
        character={status.character}
        problemCount={diagnostics.length}
      />
    </div>
  );
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const update = () => setMatches(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, [query]);

  return matches;
}
