import type { Context } from "cordis";
import { ListChecksIcon, SearchIcon } from "lucide-react";
import { useEffect, useRef } from "react";

import type { VersionResolution } from "@domorium/language-service";

import { ProblemsPanel } from "@/components/ProblemsPanel";
import { useTheme } from "@/components/ThemeProvider";
import { useCordis, useWorkspace } from "@/cordis/react";
import { GedcomEditor } from "@/editor/GedcomEditor";
import { isGedcomFileName } from "@/editor/documentSession";
import type {
  GedcomEditorHandle,
  WebDiagnostic,
  WebEditorStatus,
} from "@/editor/types";
import { cn } from "@/lib/utils";
import { activeFile, nameOf, type OpenFile } from "@/workspace/workspace";

const NOT_YET_SAID: WebEditorStatus = {
  line: 0,
  character: 0,
  resolution: undefined,
};

/**
 * The cursor moving and the document being checked are two events, and both can
 * land in one update. The last of each is kept against the editor that said it,
 * so the file carries one report rather than two halves overwriting each other,
 * and a reopened file does not inherit what its predecessor found.
 */
class GedcomModel {
  private handle: GedcomEditorHandle | null = null;
  private said: {
    editorKey: number;
    status: WebEditorStatus;
    diagnostics: WebDiagnostic[];
  } | null = null;

  constructor(private readonly ctx: Context) {}

  attach(handle: GedcomEditorHandle | null): void {
    this.handle = handle;
    this.ctx.surfaces.attach(handle);
  }

  get attached(): boolean {
    return this.handle !== null;
  }

  openSearch(): void {
    this.handle?.openSearch();
  }

  focusDiagnostic(diagnostic: WebDiagnostic): void {
    this.handle?.focusDiagnostic(diagnostic);
  }

  say(
    path: string,
    editorKey: number,
    part: { status?: WebEditorStatus; diagnostics?: WebDiagnostic[] },
  ): void {
    const base =
      this.said?.editorKey === editorKey
        ? this.said
        : { editorKey, status: NOT_YET_SAID, diagnostics: [] };
    this.said = { ...base, ...part };
    this.ctx.workspace.dispatch({
      type: "reported",
      path,
      report: {
        kind: "gedcom",
        status: this.said.status,
        diagnostics: this.said.diagnostics,
      },
    });
  }
}

/** A file the editor does not check has no findings to count, which is not none. */
function countable(ctx: Context): number | null {
  const file = ctx.workspace.active;
  if (file?.kind !== "gedcom") {
    return null;
  }
  return file.report?.kind === "gedcom" ? file.report.diagnostics.length : 0;
}

export const gedcomSurface = {
  name: "surface-gedcom",

  apply(ctx: Context) {
    const model = new GedcomModel(ctx);

    ctx.surfaces.register({
      id: "gedcom",
      order: 10,
      claims: (path) => isGedcomFileName(nameOf(path)),
      reads: "text",
      editable: true,
      render: (file) => <GedcomView model={model} file={file} />,
      facts: (report) => {
        const count = report.diagnostics.length;
        const { resolution, line, character } = report.status;
        return [
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
        ];
      },
    });

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
      render: () => <ProblemsView model={model} />,
    });

    ctx.rail.item({
      id: "search",
      order: 20,
      icon: SearchIcon,
      label: () => "Find in file",
      enabled: () => model.attached,
      activate: () => model.openSearch(),
    });
  },
};

function GedcomView({ model, file }: { model: GedcomModel; file: OpenFile }) {
  const ctx = useCordis();
  const { resolvedTheme } = useTheme();
  const editorRef = useRef<GedcomEditorHandle>(null);

  // No dependencies: the editor is destroyed and recreated on a tab switch, and
  // the model has to be holding the one that is mounted now.
  useEffect(() => {
    model.attach(editorRef.current);
    return () => model.attach(null);
  });

  return (
    <GedcomEditor
      ref={editorRef}
      editorKey={file.editorKey}
      initialText={file.initialText ?? ""}
      theme={resolvedTheme}
      onChange={() =>
        ctx.workspace.dispatch({ type: "edited", path: file.path })
      }
      onDiagnosticsChange={(diagnostics) =>
        model.say(file.path, file.editorKey, { diagnostics })
      }
      onStatusChange={(status) =>
        model.say(file.path, file.editorKey, { status })
      }
      onFollowLink={(link) =>
        ctx.commands.execute("workspace.followLink", link)
      }
    />
  );
}

function ProblemsView({ model }: { model: GedcomModel }) {
  const file = activeFile(useWorkspace());
  const report = file?.report;

  return (
    <aside aria-label="GEDCOM problems" className="h-full border-l">
      <ProblemsPanel
        diagnostics={report?.kind === "gedcom" ? report.diagnostics : []}
        onSelect={(diagnostic) => model.focusDiagnostic(diagnostic)}
      />
    </aside>
  );
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
