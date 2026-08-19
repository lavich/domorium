import { useEffect, useState, type RefObject } from "react";

import { ActivityRail } from "./ActivityRail";
import { DocumentPane } from "./DocumentPane";
import { ExplorerPanel } from "./ExplorerPanel";
import { StatusBar } from "./StatusBar";
import type { DocumentLink } from "@domorium/codemirror";

import { activeFile, type Workspace } from "@/workspace/workspace";
import type { TreeNode } from "@/workspace/tree";
import type {
  DocumentReport,
  GedcomEditorHandle,
  WebTheme,
} from "@/editor/types";

export function EditorWorkspace({
  workspace,
  theme,
  editorRef,
  onChange,
  onReport,
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
  theme: WebTheme;
  editorRef: RefObject<GedcomEditorHandle | null>;
  onChange(): void;
  onReport(path: string, report: DocumentReport): void;
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
  const report = file?.report ?? null;
  const wideEnoughForPanels = useMediaQuery("(min-width: 768px)");
  const [explorerOpen, setExplorerOpen] = useState(true);
  const [problemsOpen, setProblemsOpen] = useState(true);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1">
        <ActivityRail
          explorerOpen={explorerOpen}
          problemsOpen={problemsOpen}
          problemCount={countable(file?.kind, report)}
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
        <DocumentPane
          workspace={workspace}
          theme={theme}
          editorRef={editorRef}
          wideEnoughForPanels={wideEnoughForPanels}
          problemsOpen={problemsOpen}
          onChange={onChange}
          onReport={onReport}
          onFollowLink={onFollowLink}
          onActivate={onActivate}
          onClose={onClose}
          readBytes={readBytes}
        />
      </div>
      <StatusBar report={report} />
    </div>
  );
}

/** A file the editor does not check has no findings to count, which is not none. */
function countable(
  kind: string | undefined,
  report: DocumentReport | null,
): number | null {
  if (kind !== "gedcom") {
    return null;
  }
  return report?.kind === "gedcom" ? report.diagnostics.length : 0;
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
