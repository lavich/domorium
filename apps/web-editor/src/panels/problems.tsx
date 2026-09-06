import type { Context } from "cordis";
import { ListChecksIcon } from "lucide-react";

import { ProblemsPanel } from "@/components/ProblemsPanel";
import { useCordis, useWorkspace } from "@/cordis/react";
import { activeFile } from "@/workspace/workspace";

/** A file the editor does not check has no findings to count, which is not none. */
function countable(ctx: Context): number | null {
  const file = ctx.workspace.active;
  if (file?.kind !== "gedcom") {
    return null;
  }
  return file.report?.kind === "gedcom" ? file.report.diagnostics.length : 0;
}

export const problemsPanel = {
  name: "panel-problems",

  apply(ctx: Context) {
    ctx.rail.item({
      id: "problems",
      order: 30,
      icon: ListChecksIcon,
      slot: "aux",
      label: (badge) => {
        if (badge === null) {
          return "Problems, for a GEDCOM file";
        }
        return badge === 1 ? "1 problem" : `${badge} problems`;
      },
      badge: () => countable(ctx),
      enabled: () => countable(ctx) !== null,
      render: () => <ProblemsView />,
    });
  },
};

function ProblemsView() {
  const ctx = useCordis();
  const file = activeFile(useWorkspace());
  const report = file?.report;

  return (
    <aside aria-label="GEDCOM problems" className="h-full border-l">
      <ProblemsPanel
        diagnostics={report?.kind === "gedcom" ? report.diagnostics : []}
        onSelect={(diagnostic) => ctx.editor.focusDiagnostic(diagnostic)}
      />
    </aside>
  );
}
