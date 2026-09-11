import {
  ChevronDownIcon,
  DownloadIcon,
  FilePlusIcon,
  RotateCcwIcon,
  SaveIcon,
  UploadIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCordis, useService, useWorkspace } from "@/cordis/react";
import { savePickerAvailable } from "@/workspace/folderGateway";
import { saveAvailability } from "@/workspace/save";
import { activeFile } from "@/workspace/workspace";

const modifierKey =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
    ? "⌘"
    : "Ctrl+";

/** Stands in the tab row, which is there whatever panel is open and however
 *  narrow the window is. */
export function FileMenu() {
  const ctx = useCordis();
  const workspace = useWorkspace();
  const files = useService("files");
  const available = saveAvailability(
    activeFile(workspace),
    files ?? null,
    savePickerAvailable(),
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="h-full shrink-0 rounded-none border-r px-3"
          />
        }
      >
        File
        <ChevronDownIcon data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem
          onClick={() => ctx.commands.execute("workspace.openFile")}
        >
          <UploadIcon />
          Open…
          <span className="ml-auto font-mono text-xs text-muted-foreground">
            {modifierKey}O
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => ctx.commands.execute("workspace.save")}
          disabled={!available.save}
        >
          <SaveIcon />
          Save
          <span className="ml-auto font-mono text-xs text-muted-foreground">
            {modifierKey}S
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => ctx.commands.execute("workspace.saveAs")}
          disabled={!available.saveAs}
        >
          <FilePlusIcon />
          Save as…
          <span className="ml-auto font-mono text-xs text-muted-foreground">
            {modifierKey}⇧S
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => ctx.commands.execute("workspace.download")}
        >
          <DownloadIcon />
          Download copy
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => ctx.commands.execute("workspace.reset")}
        >
          <RotateCcwIcon />
          Reset to the example
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
