import type { ReactNode } from "react";

import { useSurfaces, useWorkspace } from "@/cordis/react";
import { activeFile } from "@/workspace/workspace";

/** What is true of the file in front, and nothing of the one before it. */
export function StatusBar() {
  const surfaces = useSurfaces();
  const file = activeFile(useWorkspace());
  const report = file?.report;
  const surface = file ? surfaces.get(file.kind) : undefined;

  return (
    <footer className="flex h-(--shell-status-height) shrink-0 items-center justify-between gap-3 overflow-hidden border-t bg-muted/30 px-3 font-mono text-[12px] whitespace-nowrap text-muted-foreground">
      <div className="flex min-w-0 items-center gap-3 overflow-hidden">
        {report ? joined(surface?.facts?.(report) ?? []) : null}
      </div>
      {/* The band is one line tall, so on a narrow viewport — the widget's
          frame, or a phone — the facts about the document keep the room. */}
      <span className="hidden shrink-0 sm:inline">
        read locally — nothing is uploaded
      </span>
    </footer>
  );
}

function joined(facts: ReactNode[]) {
  return facts.map((fact, index) => (
    <span key={index} className="flex items-center gap-3">
      {index > 0 ? <Rule /> : null}
      {fact}
    </span>
  ));
}

function Rule() {
  return <span aria-hidden className="h-3 w-px bg-border" />;
}
