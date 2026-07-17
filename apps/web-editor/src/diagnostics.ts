import type * as monaco from "monaco-editor";
import type { PublishDiagnosticsParams } from "vscode-languageserver-protocol";

export function applyDiagnostics(
  monacoApi: typeof import("monaco-editor"),
  model: monaco.editor.ITextModel,
  params: PublishDiagnosticsParams,
) {
  if (params.uri !== model.uri.toString()) return;

  const markers: monaco.editor.IMarkerData[] = params.diagnostics.map((d) => ({
    severity:
      d.severity === 1
        ? monacoApi.MarkerSeverity.Error
        : d.severity === 2
          ? monacoApi.MarkerSeverity.Warning
          : monacoApi.MarkerSeverity.Info,
    message: d.message,
    startLineNumber: d.range.start.line + 1,
    startColumn: d.range.start.character + 1,
    endLineNumber: d.range.end.line + 1,
    endColumn: d.range.end.character + 1,
    source: "gedcom-lsp",
  }));

  monacoApi.editor.setModelMarkers(model, "gedcom", markers);
}
