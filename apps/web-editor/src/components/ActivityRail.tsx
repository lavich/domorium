import { FilesIcon, ListChecksIcon, SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface ActivityRailProps {
  explorerOpen: boolean;
  problemsOpen: boolean;
  problemCount: number;
  onToggleExplorer(): void;
  onToggleProblems(): void;
  onOpenSearch(): void;
}

export function ActivityRail({
  explorerOpen,
  problemsOpen,
  problemCount,
  onToggleExplorer,
  onToggleProblems,
  onOpenSearch,
}: ActivityRailProps) {
  return (
    <nav
      aria-label="Workspace"
      className="flex w-(--rail-width) shrink-0 flex-col items-center gap-1 border-r bg-muted/30 py-2"
    >
      <RailButton
        label="Files"
        active={explorerOpen}
        onClick={onToggleExplorer}
      >
        <FilesIcon />
      </RailButton>
      <RailButton label="Find in file" onClick={onOpenSearch}>
        <SearchIcon />
      </RailButton>
      <RailButton
        label={problemCount === 1 ? "1 problem" : `${problemCount} problems`}
        active={problemsOpen}
        onClick={onToggleProblems}
      >
        <ListChecksIcon />
        {problemCount > 0 ? (
          <span
            aria-hidden
            className="absolute right-1 top-1 size-1.5 rounded-full bg-destructive"
          />
        ) : null}
      </RailButton>
    </nav>
  );
}

function RailButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
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
            aria-pressed={active}
            onClick={onClick}
            className={cn(
              "relative size-8 rounded text-muted-foreground",
              active && "bg-accent text-foreground",
            )}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
