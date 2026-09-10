import { MaximizeIcon, PlayIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { EditorPreview } from "./EditorPreview";
import { PATHS } from "./paths";

/**
 * The editor, drawn until it is asked for. The controls are links to `/editor/`
 * and the script in the page's head turns the first of them into the editor in
 * place, so a reader without scripting is sent to the editor rather than left
 * with a button that does nothing.
 */
export function EditorWidget() {
  return (
    <div data-editor-widget>
      <div
        data-editor-frame
        className="h-[380px] overflow-hidden rounded-xl ring-1 ring-border sm:h-[460px] lg:h-[520px]"
      >
        <div data-editor-preview className="h-full">
          <EditorPreview />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a
          href={PATHS.editor}
          data-editor-run
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          <PlayIcon data-icon="inline-start" />
          Run the editor here
        </a>
        <a
          href={PATHS.editor}
          data-editor-expand
          hidden
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          <MaximizeIcon data-icon="inline-start" />
          Full screen
        </a>
        <span className="text-xs text-muted-foreground">
          Runs on your machine either way.
        </span>
      </div>
    </div>
  );
}
