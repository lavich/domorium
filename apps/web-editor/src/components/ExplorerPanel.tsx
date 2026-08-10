import { ChevronDownIcon, FileCodeIcon } from "lucide-react";

export interface ExplorerPanelProps {
  fileName: string;
  modified: boolean;
}

/**
 * One document, so the tree has one leaf. The shape is here because the
 * editor is meant to grow into a project; until it does, this shows what is
 * actually open rather than folders that do not exist.
 */
export function ExplorerPanel({ fileName, modified }: ExplorerPanelProps) {
  return (
    <div className="flex w-(--explorer-width) shrink-0 flex-col border-r">
      <div className="flex h-(--shell-tabs-height) shrink-0 items-center border-b px-3 text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase">
        Explorer
      </div>
      <div className="min-h-0 flex-1 overflow-auto py-1">
        <div className="flex items-center gap-1 px-2 py-1 text-sm">
          <ChevronDownIcon className="size-3.5 text-muted-foreground" />
          <span className="truncate font-medium">Open file</span>
        </div>
        <div
          aria-current="true"
          className="mx-1 flex items-center gap-2 rounded bg-accent px-2 py-1 pl-6 text-sm"
        >
          <FileCodeIcon className="size-3.5 shrink-0 text-primary" />
          <span className="truncate font-mono text-[13px]">{fileName}</span>
          {modified ? (
            <span
              aria-label="Unsaved changes"
              className="ml-auto size-1.5 shrink-0 rounded-full bg-primary"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
