import type { WebDiagnostic } from "@/editor/types";
import { cn } from "@/lib/utils";

export interface ProblemsPanelProps {
  diagnostics: WebDiagnostic[];
  onSelect(diagnostic: WebDiagnostic): void;
}

export function ProblemsPanel({ diagnostics, onSelect }: ProblemsPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-(--shell-tabs-height) shrink-0 items-center gap-2 border-b px-3">
        <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
          Problems
        </span>
        <span className="rounded bg-muted px-1.5 font-mono text-[11px] text-muted-foreground">
          {diagnostics.length}
        </span>
      </div>
      {diagnostics.length === 0 ? (
        <p className="p-3 text-sm text-muted-foreground">
          Nothing to report. Diagnostics update as you edit.
        </p>
      ) : (
        <ul className="min-h-0 flex-1 overflow-auto">
          {diagnostics.map((diagnostic, index) => (
            <li key={`${diagnostic.from}-${diagnostic.to}-${index}`}>
              <button
                type="button"
                onClick={() => onSelect(diagnostic)}
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 border-b border-l-2 px-3 py-2 text-left hover:bg-accent/60",
                  edgeColour(diagnostic.severity),
                )}
              >
                <span className="font-mono text-[12px] text-muted-foreground">
                  Line {diagnostic.line + 1}, Column {diagnostic.character + 1}
                  {diagnostic.code ? ` · ${diagnostic.code}` : ""}
                </span>
                <span className="text-[13px] leading-[18px]">
                  {diagnostic.message}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function edgeColour(severity: WebDiagnostic["severity"]): string {
  switch (severity) {
    case "error":
      return "border-l-destructive";
    case "warning":
      return "border-l-amber-500";
    default:
      return "border-l-border";
  }
}
