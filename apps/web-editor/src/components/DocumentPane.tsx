import { useRef, type RefObject } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { EditorTabs } from "./EditorTabs";
import { ProblemsPanel } from "./ProblemsPanel";
import { ImagePreview, MarkdownPreview } from "./FilePreview";
import type { DocumentLink } from "@domorium/codemirror";

import { GedcomEditor } from "@/editor/GedcomEditor";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { activeFile, type Workspace } from "@/workspace/workspace";
import type {
  DocumentReport,
  GedcomEditorHandle,
  WebDiagnostic,
  WebEditorStatus,
  WebTheme,
} from "@/editor/types";

const NOT_YET_SAID: WebEditorStatus = {
  line: 0,
  character: 0,
  resolution: undefined,
};

export function DocumentPane({
  workspace,
  theme,
  editorRef,
  wideEnoughForPanels,
  problemsOpen,
  onChange,
  onReport,
  onFollowLink,
  onActivate,
  onClose,
  readBytes,
}: {
  workspace: Workspace;
  theme: WebTheme;
  editorRef: RefObject<GedcomEditorHandle | null>;
  wideEnoughForPanels: boolean;
  problemsOpen: boolean;
  onChange(): void;
  onReport(path: string, report: DocumentReport): void;
  onFollowLink(link: DocumentLink): void;
  onActivate(path: string): void;
  onClose(path: string): void;
  readBytes(path: string): Promise<Blob>;
}) {
  const file = activeFile(workspace);
  const report = file?.report ?? null;
  const said = useRef<{
    editorKey: number;
    status: WebEditorStatus;
    diagnostics: WebDiagnostic[];
  } | null>(null);

  /**
   * The cursor moving and the document being checked are two events, and both can
   * land in one update. The last of each is kept against the editor that said it,
   * so the file carries one report rather than two halves overwriting each other,
   * and a reopened file does not inherit what its predecessor found.
   */
  const sayGedcom = (
    path: string,
    editorKey: number,
    part: { status?: WebEditorStatus; diagnostics?: WebDiagnostic[] },
  ) => {
    const base =
      said.current?.editorKey === editorKey
        ? said.current
        : { editorKey, status: NOT_YET_SAID, diagnostics: [] };
    said.current = { ...base, ...part };
    onReport(path, {
      kind: "gedcom",
      status: said.current.status,
      diagnostics: said.current.diagnostics,
    });
  };

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
    // Keyed by path: two notes in a row are the same component in the same place,
    // and without a key the second never reports what it is.
    if (file.kind === "markdown") {
      return (
        <MarkdownPreview
          key={file.path}
          name={file.name}
          text={file.initialText ?? ""}
          onReport={(preview) => onReport(file.path, preview)}
        />
      );
    }
    if (file.kind === "image") {
      return (
        <ImagePreview
          key={file.path}
          name={file.name}
          path={file.path}
          load={readBytes}
          onReport={(preview) => onReport(file.path, preview)}
        />
      );
    }
    return (
      <GedcomEditor
        ref={editorRef}
        editorKey={file.editorKey}
        initialText={file.initialText ?? ""}
        theme={theme}
        onChange={onChange}
        onDiagnosticsChange={(diagnostics) =>
          sayGedcom(file.path, file.editorKey, { diagnostics })
        }
        onStatusChange={(status) =>
          sayGedcom(file.path, file.editorKey, { status })
        }
        onFollowLink={onFollowLink}
      />
    );
  };

  const withProblems =
    file?.kind === "gedcom" && wideEnoughForPanels && problemsOpen;

  // h-full, not only flex-1: ResizablePanel is not a flex container, so a
  // percentage is what gives the editor a definite height to scroll inside.
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <EditorTabs
        files={workspace.files}
        activePath={workspace.activePath}
        onActivate={onActivate}
        onClose={onClose}
      />
      {withProblems ? (
        <ResizablePanelGroup
          orientation="horizontal"
          className="min-h-0 flex-1"
        >
          <ResizablePanel defaultSize={72} minSize={40}>
            <div className="flex h-full min-h-0 flex-col">{surface()}</div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={28} minSize={18}>
            <aside aria-label="GEDCOM problems" className="h-full border-l">
              <ProblemsPanel
                diagnostics={
                  report?.kind === "gedcom" ? report.diagnostics : []
                }
                onSelect={(diagnostic) =>
                  editorRef.current?.focusDiagnostic(diagnostic)
                }
              />
            </aside>
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <div className="min-h-0 flex-1">{surface()}</div>
      )}
    </div>
  );
}
