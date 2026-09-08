import type { Context } from "cordis";
import { FilesIcon } from "lucide-react";
import { useSyncExternalStore } from "react";

import { ExplorerPanel } from "@/components/ExplorerPanel";
import { useCordis, useService, useWorkspace } from "@/cordis/react";
import type { FileOperations } from "@/workspace/fileGateway";
import { detectWorkspaceSupport } from "@/workspace/support";
import { toggled, treeRows, type TreeNode } from "@/workspace/tree";

/** Asked of the browser once, and not before something renders. */
let support: ReturnType<typeof detectWorkspaceSupport> | undefined;

class ExplorerModel {
  private files: FileOperations | null = null;
  private expanded: ReadonlySet<string> = new Set();
  private readonly listeners = new Set<() => void>();
  rows: TreeNode[] = [];
  /**
   * Expanding a directory is not a service changing, so cordis reruns nothing and
   * a walk still has to be able to lose the race to the one after it.
   */
  private walk = 0;

  constructor(private readonly ctx: Context) {}

  mount(files: FileOperations): void {
    this.files = files;
    this.expanded = new Set();
    void this.refresh();
  }

  unmount(): void {
    this.files = null;
    this.expanded = new Set();
    this.rows = [];
    this.publish();
  }

  toggleDirectory(path: string): void {
    this.expanded = toggled(this.expanded, path);
    void this.refresh();
  }

  reread(): void {
    void this.refresh();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  read = (): TreeNode[] => this.rows;

  private async refresh(): Promise<void> {
    const files = this.files;
    const mine = ++this.walk;
    if (!files) {
      return;
    }
    try {
      const rows = await treeRows(
        files,
        this.expanded,
        (path) => this.ctx.surfaces.claiming(path)?.id ?? null,
      );
      if (mine === this.walk) {
        this.rows = rows;
        this.publish();
      }
    } catch (cause) {
      if (mine !== this.walk) {
        return;
      }
      this.ctx.workspace.dispatch({
        type: "notice",
        message:
          cause instanceof Error
            ? cause.message
            : "The folder could not be read",
      });
    }
  }

  private publish(): void {
    for (const listener of [...this.listeners]) {
      listener();
    }
  }
}

export const explorerPanel = {
  name: "panel-explorer",

  apply(ctx: Context) {
    const model = new ExplorerModel(ctx);

    ctx.rail.item({
      id: "explorer",
      order: 10,
      icon: FilesIcon,
      slot: "side",
      label: () => "Files",
      render: () => <ExplorerView model={model} />,
    });

    // Reruns whenever another workspace is opened, and unwinds this one first.
    ctx.inject(["files"], (inner) => {
      model.mount(inner.files);
      inner.on("files/changed", () => model.reread());
      inner.effect(() => () => model.unmount());
    });
  },
};

function ExplorerView({ model }: { model: ExplorerModel }) {
  const ctx = useCordis();
  const workspace = useWorkspace();
  const files = useService("files");
  const rows = useSyncExternalStore(model.subscribe, model.read, model.read);

  return (
    <ExplorerPanel
      workspaceName={files?.label ?? workspace.name}
      rows={rows}
      activePath={workspace.activePath}
      unavailableReason={(support ??= detectWorkspaceSupport()).reason}
      notice={workspace.notice}
      onOpenFolder={() => ctx.commands.execute("workspace.openFolder")}
      onOpenFile={() => ctx.commands.execute("workspace.openFile")}
      onToggleDirectory={(path) => model.toggleDirectory(path)}
      onChooseFile={(path) =>
        ctx.commands.execute("workspace.chooseFile", path)
      }
    />
  );
}
