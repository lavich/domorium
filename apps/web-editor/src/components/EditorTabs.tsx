import { FileCodeIcon, FileTextIcon, ImageIcon, XIcon } from "lucide-react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { FileKind, OpenFile } from "@/workspace/workspace";

export interface EditorTabsProps {
  files: OpenFile[];
  activePath: string | null;
  onActivate(path: string): void;
  onClose(path: string): void;
}

export function EditorTabs({
  files,
  activePath,
  onActivate,
  onClose,
}: EditorTabsProps) {
  if (files.length === 0) {
    return (
      <div className="h-(--shell-tabs-height) shrink-0 border-b bg-muted/30" />
    );
  }

  return (
    <Tabs
      value={activePath ?? undefined}
      onValueChange={(value) => onActivate(String(value))}
      className="h-(--shell-tabs-height) shrink-0 gap-0 border-b bg-muted/30"
    >
      <ScrollArea className="w-full">
        <TabsList
          variant="line"
          aria-label="Open files"
          className="h-(--shell-tabs-height) w-max rounded-none p-0"
        >
          {files.map((file) => (
            <TabsTrigger
              key={file.path}
              value={file.path}
              title={file.path}
              className={cn(
                "h-full gap-2 rounded-none border-r border-t-2 border-t-transparent px-3",
                "data-selected:border-t-primary data-selected:bg-background",
              )}
            >
              <KindIcon kind={file.kind} />
              <span className="font-mono text-[13px]">{file.name}</span>
              {file.modified ? (
                <span
                  aria-label="Unsaved changes"
                  className="size-1.5 rounded-full bg-primary"
                />
              ) : null}
              {/*
               * A button inside a tab trigger, which a click must not turn into
               * a tab change: closing the tab beside the one in front should
               * leave the reader where they were.
               */}
              <span
                role="button"
                tabIndex={-1}
                aria-label={`Close ${file.name}`}
                className="-mr-1 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onClose(file.path);
                }}
              >
                <XIcon className="size-3" />
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </Tabs>
  );
}

function KindIcon({ kind }: { kind: FileKind }) {
  const Icon =
    kind === "gedcom"
      ? FileCodeIcon
      : kind === "image"
        ? ImageIcon
        : FileTextIcon;
  return <Icon className="size-3.5 text-muted-foreground" />;
}
