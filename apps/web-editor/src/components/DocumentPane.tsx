import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { EditorTabs } from "./EditorTabs";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { useCordis, useRail, useWorkspace } from "@/cordis/react";
import { openIn } from "@/services/rail";
import { activeFile } from "@/workspace/workspace";

export function DocumentPane({
  wideEnoughForPanels,
}: {
  wideEnoughForPanels: boolean;
}) {
  const ctx = useCordis();
  const workspace = useWorkspace();
  const rail = useRail();
  const file = activeFile(workspace);

  // One surface per kind of file, chosen by the tab in front. Keyed by path and
  // editor key together: two files in a row are the same component in the same
  // place, and a reopened file is a new editor on a path it already had.
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
    const showing = ctx.surfaces.get(file.kind);
    return (
      <div key={`${file.path}:${file.editorKey}`} className="contents">
        {showing?.render(file)}
      </div>
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
