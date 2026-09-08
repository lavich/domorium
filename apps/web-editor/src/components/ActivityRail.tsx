import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCordis, useRail, useWorkspace } from "@/cordis/react";
import { cn } from "@/lib/utils";

export function ActivityRail() {
  const ctx = useCordis();
  const { items, open } = useRail();
  // Badges are read from the workspace, so the rail has to follow it as well.
  useWorkspace();

  return (
    <nav
      aria-label="Workspace"
      className="flex w-(--rail-width) shrink-0 flex-col items-center gap-1 border-r bg-muted/30 py-2"
    >
      {items.map((item) => {
        const badge = item.badge?.() ?? null;
        const Icon = item.icon;
        return (
          <RailButton
            key={item.id}
            label={item.label(badge)}
            active={open.has(item.id)}
            disabled={item.enabled ? !item.enabled() : false}
            marked={badge !== null && badge > 0}
            onClick={() => ctx.rail.toggle(item.id)}
          >
            <Icon />
          </RailButton>
        );
      })}
    </nav>
  );
}

function RailButton({
  label,
  active,
  disabled,
  marked,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  marked?: boolean;
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
            disabled={disabled}
            onClick={onClick}
            className={cn(
              "relative size-8 rounded text-muted-foreground",
              active && "bg-accent text-foreground",
            )}
          />
        }
      >
        {children}
        {marked ? (
          <span
            aria-hidden
            className="absolute right-1 top-1 size-1.5 rounded-full bg-destructive"
          />
        ) : null}
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
