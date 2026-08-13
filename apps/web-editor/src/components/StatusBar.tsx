import type { VersionResolution } from "@domorium/language-service";

import { cn } from "@/lib/utils";

export interface StatusBarProps {
  resolution: VersionResolution | undefined;
  line: number;
  character: number;
  problemCount: number;
}

export function StatusBar({
  resolution,
  line,
  character,
  problemCount,
}: StatusBarProps) {
  const version = versionLabel(resolution);
  return (
    <footer className="flex h-(--shell-status-height) shrink-0 items-center justify-between border-t bg-muted/30 px-3 font-mono text-[12px] text-muted-foreground">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={cn("size-1.5 rounded-full", stateColour(resolution))}
          />
          {version}
        </span>
        <Rule />
        <span>{stateLabel(resolution)}</span>
        <Rule />
        <span>
          Ln {line + 1}, Col {character + 1}
        </span>
        <Rule />
        <span>
          {problemCount} {problemCount === 1 ? "issue" : "issues"}
        </span>
      </div>
      <span>read locally — nothing is uploaded</span>
    </footer>
  );
}

function Rule() {
  return <span aria-hidden className="h-3 w-px bg-border" />;
}

function versionLabel(resolution: VersionResolution | undefined): string {
  if (!resolution || resolution.kind === "undetermined") {
    return "No version";
  }
  if (resolution.kind === "paf") {
    return "Personal Ancestral File";
  }
  return `GEDCOM ${resolution.version}`;
}

function stateLabel(resolution: VersionResolution | undefined): string {
  switch (resolution?.kind) {
    case "supported":
      return "supported";
    case "substituted":
      return `checked as ${resolution.dialect}`;
    case "unsupported":
      return "not supported";
    case "paf":
      return "not checked";
    default:
      return "not stated";
  }
}

function stateColour(resolution: VersionResolution | undefined): string {
  switch (resolution?.kind) {
    case "supported":
      return "bg-emerald-600";
    case "substituted":
      return "bg-amber-500";
    default:
      return "bg-muted-foreground";
  }
}
