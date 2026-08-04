import { CircleCheckIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { WebDiagnostic } from "@/editor/types";

export function DiagnosticsPanel({
  diagnostics,
  onSelect,
}: {
  diagnostics: WebDiagnostic[];
  onSelect(diagnostic: WebDiagnostic): void;
}) {
  if (diagnostics.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CircleCheckIcon />
          </EmptyMedia>
          <EmptyTitle>No GEDCOM issues</EmptyTitle>
          <EmptyDescription>
            Diagnostics update as you edit the document.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-auto p-3">
      <div className="flex flex-wrap gap-2" aria-label="Diagnostic summary">
        <SeverityCount severity="error" diagnostics={diagnostics} />
        <SeverityCount severity="warning" diagnostics={diagnostics} />
        <SeverityCount severity="info" diagnostics={diagnostics} />
      </div>
      <ul className="flex flex-col gap-2">
        {diagnostics.map((diagnostic, index) => (
          <li key={`${diagnostic.from}-${diagnostic.to}-${index}`}>
            <Button
              variant="outline"
              className="h-auto w-full flex-col items-start gap-1 whitespace-normal p-3 text-left"
              onClick={() => onSelect(diagnostic)}
            >
              <span className="font-medium capitalize">
                {diagnostic.severity} · line {diagnostic.line + 1}, column{" "}
                {diagnostic.character + 1}
              </span>
              <span className="text-muted-foreground">
                {diagnostic.message}
              </span>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SeverityCount({
  severity,
  diagnostics,
}: {
  severity: WebDiagnostic["severity"];
  diagnostics: WebDiagnostic[];
}) {
  const count = diagnostics.filter(
    (diagnostic) => diagnostic.severity === severity,
  ).length;
  if (count === 0) {
    return null;
  }
  return (
    <Badge variant={severity === "error" ? "destructive" : "secondary"}>
      {count} {severity}
    </Badge>
  );
}
