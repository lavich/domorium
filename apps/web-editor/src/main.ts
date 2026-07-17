import {
  BrowserMessageReader,
  BrowserMessageWriter,
  createMessageConnection,
} from "vscode-jsonrpc/browser";
import type {
  MessageConnection,
} from "vscode-jsonrpc";
import {
  InitializeRequest,
  InitializedNotification,
  DidOpenTextDocumentNotification,
  DidChangeTextDocumentNotification,
  HoverRequest,
  DefinitionRequest,
  DocumentSymbolRequest,
  SemanticTokensRequest,
  FoldingRangeRequest,
  InlayHintRequest,
  type PublishDiagnosticsParams,
  type Hover,
  type DocumentSymbol,
  type SemanticTokens,
  type Location,
  type FoldingRange,
  type InlayHint,
} from "vscode-languageserver-protocol";
import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import "monaco-editor/min/vs/editor/editor.main.css";
import { registerGedcomLanguage } from "./gedcomLanguage";

const FILE_URI = "file:///workspace/simpsons55.ged";

let connection: MessageConnection;
let editor: monaco.editor.IStandaloneCodeEditor;

function setupWorker(): Promise<MessageConnection> {
  return new Promise((resolve) => {
    const worker = new Worker(
      new URL("./lspWorker.ts", import.meta.url),
      { type: "module", name: "GEDCOM LSP" },
    );

    const channel = new MessageChannel();
    worker.postMessage({ port: channel.port2 }, [channel.port2]);

    const reader = new BrowserMessageReader(channel.port1);
    const writer = new BrowserMessageWriter(channel.port1);
    const conn = createMessageConnection(reader, writer);

    conn.onNotification(
      "textDocument/publishDiagnostics",
      (params: PublishDiagnosticsParams) => {
        applyDiagnostics(params);
      },
    );

    conn.listen();
    resolve(conn);
  });
}

function applyDiagnostics(params: PublishDiagnosticsParams) {
  const markers: monaco.editor.IMarkerData[] = params.diagnostics.map((d) => ({
    severity:
      d.severity === 1
        ? monaco.MarkerSeverity.Error
        : d.severity === 2
          ? monaco.MarkerSeverity.Warning
          : monaco.MarkerSeverity.Info,
    message: d.message,
    startLineNumber: d.range.start.line + 1,
    startColumn: d.range.start.character + 1,
    endLineNumber: d.range.end.line + 1,
    endColumn: d.range.end.character + 1,
    source: "gedcom-lsp",
  }));

  monaco.editor.setModelMarkers(editor.getModel()!, "gedcom", markers);
}

async function init() {
  // Setup worker + connection
  connection = await setupWorker();

  // Initialize LSP
  const initResult = await connection.sendRequest(InitializeRequest.type, {
    processId: null,
    rootUri: "file:///workspace",
    capabilities: {},
  });

  await connection.sendNotification(InitializedNotification.type, {});

  // Configure Monaco web worker
  self.MonacoEnvironment = {
    getWorker() {
      const WorkerConstructor = editorWorker;
      return new WorkerConstructor();
    },
  };

  // Register GEDCOM language
  registerGedcomLanguage(monaco);

  // Fetch default file
  const res = await fetch(`${import.meta.env.BASE_URL}simpsons55.ged`);
  if (!res.ok) throw new Error(`Failed to load simpsons55.ged: ${res.status}`);
  const fileContent = await res.text();

  // Create editor with explicit model URI matching LSP
  const container = document.getElementById("monaco-editor-root")!;
  const model = monaco.editor.createModel(
    fileContent,
    "gedcom",
    monaco.Uri.parse(FILE_URI),
  );
  editor = monaco.editor.create(container, {
    model,
    theme: "vs-dark",
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 14,
    tabSize: 2,
    wordWrap: "on",
  });

  // Send initial document
  connection.sendNotification(DidOpenTextDocumentNotification.type, {
    textDocument: {
      uri: FILE_URI,
      languageId: "gedcom",
      version: 1,
      text: model.getValue(),
    },
  });

  // Track changes
  model.onDidChangeContent(() => {
    connection.sendNotification(DidChangeTextDocumentNotification.type, {
      textDocument: { uri: FILE_URI, version: model.getVersionId() },
      contentChanges: [{ text: model.getValue() }],
    });
  });

  // Hover provider
  monaco.languages.registerHoverProvider("gedcom", {
    async provideHover(model, position) {
      const result = await connection.sendRequest(
        HoverRequest.type,
        {
          textDocument: { uri: FILE_URI },
          position: { line: position.lineNumber - 1, character: position.column - 1 },
        },
      );

      if (!result) return null;

      const hover = result as Hover;
      const contents = Array.isArray(hover.contents)
        ? hover.contents
        : [hover.contents];

      return {
        range: new monaco.Range(
          position.lineNumber,
          position.column,
          position.lineNumber,
          position.column,
        ),
        contents: contents.map((c) => {
          if (typeof c === "string") return { value: c };
          return { value: c.value };
        }),
      };
    },
  });

  // Definition provider
  monaco.languages.registerDefinitionProvider("gedcom", {
    async provideDefinition(model, position) {
      const results = await connection.sendRequest(
        DefinitionRequest.type,
        {
          textDocument: { uri: FILE_URI },
          position: { line: position.lineNumber - 1, character: position.column - 1 },
        },
      );

      const locs = results as Location[];
      if (!locs || locs.length === 0) return null;

      return locs.map((loc) => ({
        uri: monaco.Uri.parse(loc.uri),
        range: new monaco.Range(
          loc.range.start.line + 1,
          loc.range.start.character + 1,
          loc.range.end.line + 1,
          loc.range.end.character + 1,
        ),
      }));
    },
  });

  // Document symbols provider
  monaco.languages.registerDocumentSymbolProvider("gedcom", {
    async provideDocumentSymbols(model) {
      const result = await connection.sendRequest(
        DocumentSymbolRequest.type,
        {
          textDocument: { uri: FILE_URI },
        },
      );

      const syms = result as DocumentSymbol[];
      const mapSym = (sym: DocumentSymbol): monaco.languages.DocumentSymbol => ({
        name: sym.name,
        detail: sym.detail ?? "",
        kind: sym.kind as monaco.languages.SymbolKind,
        tags: [],
        range: new monaco.Range(
          sym.range.start.line + 1,
          sym.range.start.character + 1,
          sym.range.end.line + 1,
          sym.range.end.character + 1,
        ),
        selectionRange: new monaco.Range(
          sym.selectionRange.start.line + 1,
          sym.selectionRange.start.character + 1,
          sym.selectionRange.end.line + 1,
          sym.selectionRange.end.character + 1,
        ),
        children: (sym.children ?? []).map(mapSym),
      });
      return syms.map(mapSym);
    },
  });

  // Folding range provider
  monaco.languages.registerFoldingRangeProvider("gedcom", {
    async provideFoldingRanges(model) {
      const result = await connection.sendRequest(
        FoldingRangeRequest.type,
        {
          textDocument: { uri: FILE_URI },
        },
      );

      const ranges = result as FoldingRange[];
      return ranges.map((r) => ({
        start: r.startLine + 1,
        end: r.endLine + 1,
        kind: r.kind as monaco.languages.FoldingRangeKind | undefined,
      }));
    },
  });

  // Semantic tokens provider
  const legend = initResult.capabilities.semanticTokensProvider?.legend;
  if (legend) {
    monaco.languages.registerDocumentSemanticTokensProvider("gedcom", {
      getLegend() {
        return {
          tokenTypes: legend.tokenTypes,
          tokenModifiers: legend.tokenModifiers ?? [],
        };
      },
      provideDocumentSemanticTokens(model) {
        return connection
          .sendRequest(
            SemanticTokensRequest.type,
            {
              textDocument: { uri: FILE_URI },
            },
          )
          .then((result) => {
            const tokens = result as SemanticTokens;
            return {
              data: new Uint32Array(tokens.data),
            };
          });
      },
      releaseDocumentSemanticTokens() {},
    });
  }

  // Inlay hints provider
  monaco.languages.registerInlayHintsProvider("gedcom", {
    async provideInlayHints(model, range) {
      const result = await connection.sendRequest(
        InlayHintRequest.type,
        {
          textDocument: { uri: FILE_URI },
          range: {
            start: { line: range.startLineNumber - 1, character: range.startColumn - 1 },
            end: { line: range.endLineNumber - 1, character: range.endColumn - 1 },
          },
        },
      );

      const hints = result as InlayHint[];
      return {
        hints: hints.map((hint) => ({
          kind: hint.kind as monaco.languages.InlayHintKind,
          label: typeof hint.label === "string"
            ? hint.label
            : hint.label.map((l: { value: string }) => l.value).join(""),
          position: new monaco.Position(
            hint.position.line + 1,
            hint.position.character + 1,
          ),
        })),
        dispose: () => {},
      };
    },
  });
}

init().catch(console.error);
