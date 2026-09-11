import { FileTextIcon, ImageIcon, XIcon } from "lucide-react";
import type { ReactNode } from "react";

import { GedcomFileIcon } from "./GedcomFileIcon";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { SurfaceId } from "@/editor/types";
import type { OpenFile } from "@/workspace/workspace";

export interface EditorTabsProps {
  files: OpenFile[];
  activePath: string | null;
  /** Held in the row ahead of the tabs, which is there whether or not any are. */
  leading?: ReactNode;
  onActivate(path: string): void;
  onClose(path: string): void;
}

export function EditorTabs({
  files,
  activePath,
  leading,
  onActivate,
  onClose,
}: EditorTabsProps) {
  return (
    <div className="flex h-(--shell-tabs-height) shrink-0 items-stretch border-b bg-muted/30">
      {leading}
      {files.length === 0 ? null : (
        <Tabs
          value={activePath ?? undefined}
          onValueChange={(value) => onActivate(String(value))}
          className="min-w-0 flex-1 gap-0"
        >
          {/*
           * A scrollbar drawn inside one row this short would sit over the mark on the
           * tab in front and shorten the row that carries it.
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
                    // The line variant marks the tab in front below the tab itself,
                    // which this row clips away, and paints the tab transparent from
                    // the list above — its borders too in the dark theme — so the mark
                    // is drawn here instead and has to say it means it.
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
                  {/* Closing a tab must not also select it. */}
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
      )}
    </div>
  );
}

function KindIcon({ kind }: { kind: SurfaceId }) {
  if (kind === "gedcom") {
    return <GedcomFileIcon className="size-3.5 text-primary" />;
  }
  const Icon = kind === "image" ? ImageIcon : FileTextIcon;
  return <Icon className="size-3.5 text-muted-foreground" />;
}
