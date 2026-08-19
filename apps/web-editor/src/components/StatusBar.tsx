import type { VersionResolution } from "@domorium/language-service";

import type { DocumentReport } from "@/editor/types";
import { cn, kilobytes } from "@/lib/utils";

export interface StatusBarProps {
  report: DocumentReport | null;
}

export function StatusBar({ report }: StatusBarProps) {
  return (
    <footer className="flex h-(--shell-status-height) shrink-0 items-center justify-between border-t bg-muted/30 px-3 font-mono text-[12px] text-muted-foreground">
      <div className="flex items-center gap-3">{facts(report)}</div>
      <span>read locally — nothing is uploaded</span>
    </footer>
  );
}

/** What is true of the file in front, and nothing of the one before it. */
function facts(report: DocumentReport | null) {
  if (!report) {
    return null;
  }
  if (report.kind === "markdown") {
    return joined(["Markdown", "read-only"]);
  }
  if (report.kind === "image") {
    return joined([
      report.format,
      report.width !== null && report.height !== null
        ? `${report.width} × ${report.height}`
        : null,
      kilobytes(report.bytes),
    ]);
  }
  const { resolution, line, character } = report.status;
  const count = report.diagnostics.length;
  return joined([
    <span key="version" className="flex items-center gap-1.5">
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", stateColour(resolution))}
      />
      {versionLabel(resolution)}
    </span>,
    stateLabel(resolution),
    `Ln ${line + 1}, Col ${character + 1}`,
    `${count} ${count === 1 ? "issue" : "issues"}`,
  ]);
}

function joined(parts: (React.ReactNode | null)[]) {
  return parts
    .filter((part) => part !== null)
    .map((part, index) => (
      <span key={index} className="flex items-center gap-3">
        {index > 0 ? <Rule /> : null}
        {part}
      </span>
    ));
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
