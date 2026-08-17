import {
  ChevronDownIcon,
  ChevronRightIcon,
  FileIcon,
  FileTextIcon,
  FolderIcon,
  FolderOpenIcon,
  FolderPlusIcon,
  ImageIcon,
  UploadIcon,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { GedcomFileIcon } from "./GedcomFileIcon";
import type { TreeNode } from "@/workspace/tree";
import type { FileKind } from "@/workspace/workspace";

export interface ExplorerPanelProps {
  /** The workspace's name, or null before one is opened. */
  workspaceName: string | null;
  rows: TreeNode[];
  activePath: string | null;
  /** Null where the browser can grant a folder; the reason where it cannot. */
  unavailableReason: string | null;
  notice: string | null;
  onOpenFolder(): void;
  onOpenFile(): void;
  onToggleDirectory(path: string): void;
  onChooseFile(path: string): void;
}

export function ExplorerPanel({
  workspaceName,
  rows,
  activePath,
  unavailableReason,
  notice,
  onOpenFolder,
  onOpenFile,
  onToggleDirectory,
  onChooseFile,
}: ExplorerPanelProps) {
  return (
    <div className="flex w-(--explorer-width) shrink-0 flex-col border-r">
      <div className="flex h-(--shell-tabs-height) shrink-0 items-center gap-1 border-b pr-1 pl-3">
        <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
          Explorer
        </span>
        <div className="ml-auto flex items-center">
          {unavailableReason ? null : (
            <HeaderAction label="Open a folder" onClick={onOpenFolder}>
              <FolderPlusIcon />
            </HeaderAction>
          )}
          <HeaderAction label="Open a single GEDCOM file" onClick={onOpenFile}>
            <UploadIcon />
          </HeaderAction>
        </div>
      </div>

      {workspaceName ? (
        <div className="flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-sm">
          <FolderOpenIcon className="size-3.5 text-muted-foreground" />
          <span className="truncate font-medium" title={workspaceName}>
            {workspaceName}
          </span>
        </div>
      ) : null}

      {notice ? (
        <Alert variant="destructive" className="mx-2 mb-1 w-auto py-2">
          <AlertDescription className="text-[12px]">{notice}</AlertDescription>
        </Alert>
      ) : null}

      <ScrollArea className="min-h-0 flex-1">
        {rows.length === 0 ? (
          <Empty className="p-4">
            <EmptyTitle className="text-sm">
              {unavailableReason ? "One file at a time" : "No folder open"}
            </EmptyTitle>
            <EmptyDescription className="text-[12px]">
              {unavailableReason ??
                "Open a folder to read the GEDCOM file with the media and notes beside it. The folder is not remembered between visits."}
            </EmptyDescription>
          </Empty>
        ) : (
          <ul className="py-1">
            {rows.map((row) => (
              <li key={row.path}>
                <Row
                  row={row}
                  active={row.path === activePath}
                  onSelect={() =>
                    row.kind === "directory"
                      ? onToggleDirectory(row.path)
                      : onChooseFile(row.path)
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}

function Row({
  row,
  active,
  onSelect,
}: {
  row: TreeNode;
  active: boolean;
  onSelect(): void;
}) {
  const openable = row.kind === "directory" || row.kindIfFile !== "unsupported";
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "true" : undefined}
      // Indentation is 12px per level, as the design system says, and the name
      // is text: a file called `<b>x</b>.ged` is a name, not markup.
      style={{ paddingLeft: `${8 + row.depth * 12}px` }}
      className={cn(
        "flex w-full items-center gap-1.5 py-1 pr-2 text-left text-sm",
        active ? "bg-accent" : "hover:bg-accent/60",
        openable ? "" : "text-muted-foreground",
      )}
    >
      {row.kind === "directory" ? (
        row.expanded ? (
          <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
        )
      ) : (
        <span className="size-3.5 shrink-0" />
      )}
      <RowIcon row={row} />
      <span className="truncate font-mono text-[13px]" title={row.path}>
        {row.name}
      </span>
      {openable ? null : (
        <span className="ml-auto text-[10px] tracking-wide uppercase">
          not shown
        </span>
      )}
    </button>
  );
}

function RowIcon({ row }: { row: TreeNode }) {
  if (row.kind === "directory") {
    return <FolderIcon className="size-3.5 shrink-0 text-muted-foreground" />;
  }
  if (row.kindIfFile === "gedcom") {
    return <GedcomFileIcon className="size-3.5 shrink-0 text-primary" />;
  }
  const Icon = iconFor(row.kindIfFile);
  return <Icon className="size-3.5 shrink-0 text-muted-foreground" />;
}

function iconFor(kind: FileKind | null) {
  switch (kind) {
    case "markdown":
      return FileTextIcon;
    case "image":
      return ImageIcon;
    default:
      return FileIcon;
  }
}

function HeaderAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick(): void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={label}
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
