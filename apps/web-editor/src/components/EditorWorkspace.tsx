import type { RefObject } from "react";
import {
  DownloadIcon,
  ListChecksIcon,
  RotateCcwIcon,
  UploadIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { DocumentSession } from "@/editor/documentSession";
import { GedcomEditor } from "@/editor/GedcomEditor";
import type {
  GedcomEditorHandle,
  WebDiagnostic,
  WebTheme,
} from "@/editor/types";

import { DiagnosticsPanel } from "./DiagnosticsPanel";

export function EditorWorkspace({
  session,
  modified,
  diagnostics,
  theme,
  editorRef,
  onChange,
  onDiagnosticsChange,
  onOpenFile,
  onDownload,
  onReset,
}: {
  session: DocumentSession;
  modified: boolean;
  diagnostics: WebDiagnostic[];
  theme: WebTheme;
  editorRef: RefObject<GedcomEditorHandle | null>;
  onChange(text: string): void;
  onDiagnosticsChange(diagnostics: WebDiagnostic[]): void;
  onOpenFile(): void;
  onDownload(): void;
  onReset(): void;
}) {
  const selectDiagnostic = (diagnostic: WebDiagnostic) =>
    editorRef.current?.focusDiagnostic(diagnostic);

  return (
    <Card className="min-h-[42rem] min-w-0 lg:h-[calc(100svh-7rem)]">
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate">{session.fileName}</CardTitle>
            <CardDescription>
              {session.source === "demo"
                ? "Try editing the bundled example"
                : "Editing a local browser copy"}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={modified ? "default" : "secondary"}>
              {modified
                ? "Modified"
                : session.source === "demo"
                  ? "Demo"
                  : "Saved copy"}
            </Badge>
            <Badge variant={diagnostics.length ? "outline" : "secondary"}>
              {diagnostics.length} issues
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onOpenFile}>
            <UploadIcon data-icon="inline-start" />
            Open
          </Button>
          <Button onClick={onDownload}>
            <DownloadIcon data-icon="inline-start" />
            Download copy
          </Button>
          <Button variant="ghost" onClick={onReset}>
            <RotateCcwIcon data-icon="inline-start" />
            Reset demo
          </Button>
          <Sheet>
            <SheetTrigger
              render={<Button variant="outline" className="md:hidden" />}
            >
              <ListChecksIcon data-icon="inline-start" />
              Diagnostics
            </SheetTrigger>
            <SheetContent side="bottom">
              <SheetHeader>
                <SheetTitle>GEDCOM diagnostics</SheetTitle>
                <SheetDescription>
                  Select an issue to reveal it in the editor.
                </SheetDescription>
              </SheetHeader>
              <DiagnosticsPanel
                diagnostics={diagnostics}
                onSelect={selectDiagnostic}
              />
            </SheetContent>
          </Sheet>
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 px-0">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel defaultSize={75} minSize={45}>
            <GedcomEditor
              ref={editorRef}
              editorKey={session.editorKey}
              initialText={session.text}
              theme={theme}
              onChange={onChange}
              onDiagnosticsChange={onDiagnosticsChange}
            />
          </ResizablePanel>
          <ResizableHandle className="hidden md:flex" withHandle />
          <ResizablePanel
            defaultSize={25}
            minSize={18}
            className="hidden md:block"
          >
            <aside aria-label="GEDCOM diagnostics" className="h-full">
              <DiagnosticsPanel
                diagnostics={diagnostics}
                onSelect={selectDiagnostic}
              />
            </aside>
          </ResizablePanel>
        </ResizablePanelGroup>
      </CardContent>
    </Card>
  );
}
