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
import { GedcomEditor } from "@/editor/GedcomEditor";
import type { DocumentSession } from "@/editor/documentSession";
import type {
  GedcomEditorHandle,
  WebDiagnostic,
  WebEditorStatus,
  WebTheme,
} from "@/editor/types";

export function EditorWorkspace({
  session,
  modified,
  diagnostics,
  status,
  theme,
  editorRef,
  onChange,
  onDiagnosticsChange,
  onStatusChange,
  onOpenFile,
  onDownload,
}: {
  session: DocumentSession;
  modified: boolean;
  diagnostics: WebDiagnostic[];
  status: WebEditorStatus;
  theme: WebTheme;
  editorRef: RefObject<GedcomEditorHandle | null>;
  onChange(): void;
  onDiagnosticsChange(diagnostics: WebDiagnostic[]): void;
  onStatusChange(status: WebEditorStatus): void;
  onOpenFile(): void;
  onDownload(): void;
}) {
  const wideEnoughForPanels = useMediaQuery("(min-width: 768px)");
  const [explorerOpen, setExplorerOpen] = useState(true);
  const [problemsOpen, setProblemsOpen] = useState(true);
  const selectDiagnostic = (diagnostic: WebDiagnostic) =>
    editorRef.current?.focusDiagnostic(diagnostic);

  const editor = (
    <GedcomEditor
      ref={editorRef}
      editorKey={session.editorKey}
      initialText={session.initialText}
      theme={theme}
      onChange={onChange}
      onDiagnosticsChange={onDiagnosticsChange}
      onStatusChange={onStatusChange}
    />
  );

  // h-full, not only flex-1: ResizablePanel is not a flex container, so a
  // percentage is what gives the editor a definite height to scroll inside.
  const pane = (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <EditorTabs fileName={session.fileName} modified={modified} />
      <div className="min-h-0 flex-1">{editor}</div>
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
            fileName={session.fileName}
            modified={modified}
            onOpenFile={onOpenFile}
            onDownload={onDownload}
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
