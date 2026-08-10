import { FileCodeIcon } from "lucide-react";

export interface EditorTabsProps {
  fileName: string;
  modified: boolean;
}

export function EditorTabs({ fileName, modified }: EditorTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Open files"
      className="flex h-(--shell-tabs-height) shrink-0 items-stretch border-b bg-muted/30"
    >
      <div
        role="tab"
        aria-selected="true"
        className="flex items-center gap-2 border-r border-t-2 border-t-primary bg-background px-3"
      >
        <FileCodeIcon className="size-3.5 text-primary" />
        <span className="font-mono text-[13px]">{fileName}</span>
        {modified ? (
          <span
            aria-label="Unsaved changes"
            className="size-1.5 rounded-full bg-primary"
          />
        ) : null}
      </div>
    </div>
  );
}
