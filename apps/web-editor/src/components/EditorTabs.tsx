import { FileTextIcon, ImageIcon, XIcon } from "lucide-react";

import { GedcomFileIcon } from "./GedcomFileIcon";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      {/*
       * More tabs than room scroll sideways, and nothing scrolls up: the strip is
       * one row as tall as the band, so a scrollbar drawn inside it would sit over
       * the line marking the tab in front and shorten the row that carries it.
       */}
      <div className="scrollbar-none h-full w-full overflow-x-auto overflow-y-hidden">
        <TabsList
          variant="line"
          aria-label="Open files"
          className="h-full! w-max rounded-none p-0"
        >
          {files.map((file) => (
            <TabsTrigger
              key={file.path}
              value={file.path}
              title={file.path}
              className={cn(
                "h-full gap-2 rounded-none border-r border-b-2 border-b-transparent px-3",
                // The line variant marks the tab in front five pixels below the
                // tab, which is outside this row: the mark belongs inside it,
                // where the strip cannot clip it away.
                // The variant paints the tab in front transparent from the list
                // above — and in the dark theme its borders too — so both the mark
                // and the raised look have to say they mean it.
                "after:hidden data-active:border-b-primary! data-active:bg-background!",
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
      </div>
    </Tabs>
  );
}

function KindIcon({ kind }: { kind: FileKind }) {
  if (kind === "gedcom") {
    return <GedcomFileIcon className="size-3.5 text-primary" />;
  }
  const Icon = kind === "image" ? ImageIcon : FileTextIcon;
  return <Icon className="size-3.5 text-muted-foreground" />;
}
