import { useEffect, useRef } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { EditorTabs } from "./EditorTabs";
import { ImagePreview, MarkdownPreview } from "./FilePreview";
import type { DocumentLink } from "@domorium/codemirror";

import { GedcomEditor } from "@/editor/GedcomEditor";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { useCordis, useRail, useWorkspace } from "@/cordis/react";
import { openIn } from "@/services/rail";
import { activeFile } from "@/workspace/workspace";
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
  theme,
  wideEnoughForPanels,
  onFollowLink,
}: {
  theme: WebTheme;
  wideEnoughForPanels: boolean;
  onFollowLink(link: DocumentLink): void;
}) {
  const ctx = useCordis();
  const workspace = useWorkspace();
  const rail = useRail();
  const file = activeFile(workspace);
  const editorRef = useRef<GedcomEditorHandle>(null);
  const said = useRef<{
    editorKey: number;
    status: WebEditorStatus;
    diagnostics: WebDiagnostic[];
  } | null>(null);

  // No dependencies: the editor is destroyed and recreated on a tab switch, and
  // the service has to be holding the one that is mounted now.
  useEffect(() => {
    ctx.editor.attach(editorRef.current);
    return () => ctx.editor.attach(null);
  });

  const report = (path: string, next: DocumentReport) =>
    ctx.workspace.dispatch({ type: "reported", path, report: next });

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
    report(path, {
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
          onReport={(preview) => report(file.path, preview)}
        />
      );
    }
    if (file.kind === "image") {
      return (
        <ImagePreview
          key={file.path}
          name={file.name}
          path={file.path}
          load={(path) =>
            ctx.files
              ? ctx.files.readBytes(path)
              : Promise.reject(new Error("No workspace is open"))
          }
          onReport={(preview) => report(file.path, preview)}
        />
      );
    }
    return (
      <GedcomEditor
        ref={editorRef}
        editorKey={file.editorKey}
        initialText={file.initialText ?? ""}
        theme={theme}
        onChange={() =>
          ctx.workspace.dispatch({ type: "edited", path: file.path })
        }
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

  const aux = wideEnoughForPanels ? openIn(rail, "aux") : undefined;
  const withAux = aux?.enabled?.() === false ? undefined : aux;

  // h-full, not only flex-1: ResizablePanel is not a flex container, so a
  // percentage is what gives the editor a definite height to scroll inside.
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <EditorTabs
        files={workspace.files}
        activePath={workspace.activePath}
        onActivate={(path) =>
          ctx.commands.execute("workspace.activateTab", path)
        }
        onClose={(path) => ctx.commands.execute("workspace.closeTab", path)}
      />
      {withAux ? (
        <ResizablePanelGroup
          orientation="horizontal"
          className="min-h-0 flex-1"
        >
          <ResizablePanel defaultSize={72} minSize={40}>
            <div className="flex h-full min-h-0 flex-col">{surface()}</div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={28} minSize={18}>
            {withAux.render?.()}
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <div className="min-h-0 flex-1">{surface()}</div>
      )}
    </div>
  );
}
