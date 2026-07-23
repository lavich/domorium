import type * as monaco from "monaco-editor";
import type { MessageConnection } from "vscode-jsonrpc";
import {
  CompletionItemKind,
  CompletionRequest,
  DefinitionRequest,
  DocumentSymbolRequest,
  FoldingRangeRequest,
  HoverRequest,
  InlayHintRequest,
  SemanticTokensRequest,
  ReferencesRequest,
  DocumentHighlightRequest,
  PrepareRenameRequest,
  RenameRequest,
  DocumentLinkRequest,
  CodeActionRequest,
  DocumentHighlightKind,
  type WorkspaceEdit,
  type CodeAction,
  type DocumentHighlight,
  type DocumentLink,
  type PrepareRenameResult,
  type DocumentSymbol,
  type CompletionItem as LspCompletionItem,
  type CompletionList as LspCompletionList,
  type FoldingRange,
  type Hover,
  type InlayHint,
  type Location,
  type SemanticTokens,
} from "vscode-languageserver-protocol";

const LANGUAGE_ID = "gedcom";

export function toMonacoCompletionItems(
  monacoApi: typeof import("monaco-editor"),
  result: LspCompletionItem[] | LspCompletionList | null,
  range: monaco.IRange,
): monaco.languages.CompletionItem[] {
  const items = Array.isArray(result) ? result : result?.items ?? [];
  const kindMap: Partial<Record<CompletionItemKind, monaco.languages.CompletionItemKind>> = {
    [CompletionItemKind.Field]: monacoApi.languages.CompletionItemKind.Field,
    [CompletionItemKind.EnumMember]: monacoApi.languages.CompletionItemKind.EnumMember,
    [CompletionItemKind.Reference]: monacoApi.languages.CompletionItemKind.Reference,
  };

  return items.map((item) => {
    const label = item.label as string | { label: string };
    return {
      label: item.label,
      detail: item.detail,
      kind: (item.kind && kindMap[item.kind]) ?? monacoApi.languages.CompletionItemKind.Text,
      insertText: typeof label === "string" ? label : label.label,
      range,
    };
  });
}

export function registerLspProviders(
  monacoApi: typeof import("monaco-editor"),
  connection: MessageConnection,
  legend: { tokenTypes: string[]; tokenModifiers?: string[] } | undefined,
) {
  monacoApi.languages.registerCompletionItemProvider(LANGUAGE_ID, {
    triggerCharacters: [" "],
    async provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endLineNumber: position.lineNumber,
        endColumn: word.endColumn,
      };
      const result = await connection.sendRequest(CompletionRequest.type, {
        textDocument: { uri: model.uri.toString() },
        position: {
          line: position.lineNumber - 1,
          character: position.column - 1,
        },
      });
      return { suggestions: toMonacoCompletionItems(monacoApi, result, range) };
    },
  });

  monacoApi.languages.registerHoverProvider(LANGUAGE_ID, {
    async provideHover(model, position) {
      const result = await connection.sendRequest(HoverRequest.type, {
        textDocument: { uri: model.uri.toString() },
        position: { line: position.lineNumber - 1, character: position.column - 1 },
      });
      if (!result) {
        return null;
      }

      const hover = result as Hover;
      const contents = Array.isArray(hover.contents) ? hover.contents : [hover.contents];
      return {
        range: new monacoApi.Range(position.lineNumber, position.column, position.lineNumber, position.column),
        contents: contents.map((content) =>
          typeof content === "string" ? { value: content } : { value: content.value },
        ),
      };
    },
  });

  monacoApi.languages.registerDefinitionProvider(LANGUAGE_ID, {
    async provideDefinition(model, position) {
      const results = await connection.sendRequest(DefinitionRequest.type, {
        textDocument: { uri: model.uri.toString() },
        position: { line: position.lineNumber - 1, character: position.column - 1 },
      });
      const locations = results as Location[];
      if (!locations?.length) {
        return null;
      }
      return locations.map((location) => ({
        uri: monacoApi.Uri.parse(location.uri),
        range: toRange(monacoApi, location.range),
      }));
    },
  });

  monacoApi.languages.registerReferenceProvider(LANGUAGE_ID, {
    async provideReferences(model, position, context, token) {
      const result = await connection.sendRequest(
        ReferencesRequest.type,
        {
          textDocument: { uri: model.uri.toString() },
          position: toLspPosition(position),
          context: { includeDeclaration: context.includeDeclaration },
        },
        token,
      );
      if (token.isCancellationRequested) return [];
      return ((result ?? []) as Location[]).map((location) => ({
        uri: monacoApi.Uri.parse(location.uri),
        range: toRange(monacoApi, location.range),
      }));
    },
  });

  monacoApi.languages.registerDocumentHighlightProvider(LANGUAGE_ID, {
    async provideDocumentHighlights(model, position, token) {
      const result = await connection.sendRequest(
        DocumentHighlightRequest.type,
        {
          textDocument: { uri: model.uri.toString() },
          position: toLspPosition(position),
        },
        token,
      );
      if (token.isCancellationRequested) return [];
      return ((result ?? []) as DocumentHighlight[]).map((highlight) => ({
        range: toRange(monacoApi, highlight.range),
        kind:
          highlight.kind === DocumentHighlightKind.Write
            ? monacoApi.languages.DocumentHighlightKind.Write
            : monacoApi.languages.DocumentHighlightKind.Read,
      }));
    },
  });

  monacoApi.languages.registerRenameProvider(LANGUAGE_ID, {
    async resolveRenameLocation(model, position, token) {
      let result: PrepareRenameResult | null;
      try {
        result = await connection.sendRequest(
          PrepareRenameRequest.type,
          {
            textDocument: { uri: model.uri.toString() },
            position: toLspPosition(position),
          },
          token,
        );
      } catch (error) {
        return {
          range: new monacoApi.Range(1, 1, 1, 1),
          text: "",
          rejectReason: rpcErrorMessage(error),
        };
      }
      if (token.isCancellationRequested || !result) {
        return { range: new monacoApi.Range(1, 1, 1, 1), text: "", rejectReason: "Rename cancelled" };
      }
      const prepared = result as Exclude<PrepareRenameResult, null>;
      if ("defaultBehavior" in prepared) {
        return { range: new monacoApi.Range(position.lineNumber, position.column, position.lineNumber, position.column), text: "" };
      }
      const range = "range" in prepared ? prepared.range : prepared;
      return {
        range: toRange(monacoApi, range),
        text: "placeholder" in prepared ? prepared.placeholder : model.getValueInRange(toRange(monacoApi, range)),
      };
    },
    async provideRenameEdits(model, position, newName, token) {
      let result: WorkspaceEdit | null;
      try {
        result = await connection.sendRequest(
          RenameRequest.type,
          {
            textDocument: { uri: model.uri.toString() },
            position: toLspPosition(position),
            newName,
          },
          token,
        );
      } catch (error) {
        return { edits: [], rejectReason: rpcErrorMessage(error) };
      }
      if (token.isCancellationRequested || !result) return { edits: [] };
      return toMonacoWorkspaceEdit(monacoApi, result);
    },
  });

  monacoApi.languages.registerLinkProvider(LANGUAGE_ID, {
    async provideLinks(model, token) {
      const result = await connection.sendRequest(
        DocumentLinkRequest.type,
        { textDocument: { uri: model.uri.toString() } },
        token,
      );
      if (token.isCancellationRequested) return { links: [] };
      return {
        links: ((result ?? []) as DocumentLink[]).map((link) => ({
          range: toRange(monacoApi, link.range),
          url:
            link.target && /^https?:\/\//iu.test(link.target)
              ? monacoApi.Uri.parse(link.target)
              : undefined,
          tooltip: link.tooltip,
        })),
      };
    },
  });

  monacoApi.languages.registerCodeActionProvider(
    LANGUAGE_ID,
    {
      async provideCodeActions(model, range, context, token) {
        const result = await connection.sendRequest(
          CodeActionRequest.type,
          {
            textDocument: { uri: model.uri.toString() },
            range: toLspRange(range),
            context: {
              diagnostics: context.markers.map((marker) => ({
                range: toLspRange(marker),
                message: marker.message,
                code:
                  typeof marker.code === "object"
                    ? marker.code.value
                    : marker.code,
              })),
            },
          },
          token,
        );
        if (token.isCancellationRequested) return { actions: [], dispose() {} };
        return {
          actions: ((result ?? []) as CodeAction[]).map((action) => ({
            title: action.title,
            kind: action.kind,
            diagnostics: context.markers,
            edit: action.edit
              ? toMonacoWorkspaceEdit(monacoApi, action.edit)
              : undefined,
          })),
          dispose() {},
        };
      },
    },
    { providedCodeActionKinds: ["quickfix"] },
  );

  monacoApi.languages.registerDocumentSymbolProvider(LANGUAGE_ID, {
    async provideDocumentSymbols(model) {
      const result = await connection.sendRequest(DocumentSymbolRequest.type, {
        textDocument: { uri: model.uri.toString() },
      });
      return (result as DocumentSymbol[]).map((symbol) => toDocumentSymbol(monacoApi, symbol));
    },
  });

  monacoApi.languages.registerFoldingRangeProvider(LANGUAGE_ID, {
    async provideFoldingRanges(model) {
      const result = await connection.sendRequest(FoldingRangeRequest.type, {
        textDocument: { uri: model.uri.toString() },
      });
      return (result as FoldingRange[]).map((range) => ({
        start: range.startLine + 1,
        end: range.endLine + 1,
        kind: range.kind as monaco.languages.FoldingRangeKind | undefined,
      }));
    },
  });

  if (legend) {
    monacoApi.languages.registerDocumentSemanticTokensProvider(LANGUAGE_ID, {
      getLegend: () => ({ tokenTypes: legend.tokenTypes, tokenModifiers: legend.tokenModifiers ?? [] }),
      provideDocumentSemanticTokens(model) {
        return connection.sendRequest(SemanticTokensRequest.type, {
          textDocument: { uri: model.uri.toString() },
        }).then((result) => ({ data: new Uint32Array((result as SemanticTokens).data) }));
      },
      releaseDocumentSemanticTokens() {},
    });
  }

  monacoApi.languages.registerInlayHintsProvider(LANGUAGE_ID, {
    async provideInlayHints(model, range) {
      const result = await connection.sendRequest(InlayHintRequest.type, {
        textDocument: { uri: model.uri.toString() },
        range: {
          start: { line: range.startLineNumber - 1, character: range.startColumn - 1 },
          end: { line: range.endLineNumber - 1, character: range.endColumn - 1 },
        },
      });
      return {
        hints: (result as InlayHint[]).map((hint) => ({
          kind: hint.kind as monaco.languages.InlayHintKind,
          label: typeof hint.label === "string" ? hint.label : hint.label.map((part) => part.value).join(""),
          position: new monacoApi.Position(hint.position.line + 1, hint.position.character + 1),
        })),
        dispose: () => {},
      };
    },
  });
}

function toLspPosition(position: monaco.IPosition) {
  return { line: position.lineNumber - 1, character: position.column - 1 };
}

function toLspRange(range: monaco.IRange) {
  return {
    start: { line: range.startLineNumber - 1, character: range.startColumn - 1 },
    end: { line: range.endLineNumber - 1, character: range.endColumn - 1 },
  };
}

function toMonacoWorkspaceEdit(
  monacoApi: typeof import("monaco-editor"),
  edit: WorkspaceEdit,
): monaco.languages.WorkspaceEdit & { rejectReason?: string } {
  const edits: monaco.languages.IWorkspaceTextEdit[] = [];
  if (edit.changes || !edit.documentChanges) {
    return {
      edits: [],
      rejectReason: "The server returned an unversioned workspace edit.",
    };
  }
  for (const change of edit.documentChanges) {
    if (
      !("textDocument" in change) ||
      !("edits" in change) ||
      typeof change.textDocument.version !== "number"
    ) {
      return {
        edits: [],
        rejectReason: "The server returned an unsupported workspace edit.",
      };
    }
    for (const textEdit of change.edits) {
      if (!("range" in textEdit) || !("newText" in textEdit)) {
        return {
          edits: [],
          rejectReason: "The server returned an unsupported workspace edit.",
        };
      }
      edits.push({
        resource: monacoApi.Uri.parse(change.textDocument.uri),
        versionId: change.textDocument.version,
        textEdit: {
          range: toRange(monacoApi, textEdit.range),
          text: textEdit.newText,
        },
      });
    }
  }
  return { edits };
}

function rpcErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "Rename was rejected by the language server.";
}

function toRange(monacoApi: typeof import("monaco-editor"), range: { start: { line: number; character: number }; end: { line: number; character: number } }) {
  return new monacoApi.Range(range.start.line + 1, range.start.character + 1, range.end.line + 1, range.end.character + 1);
}

function toDocumentSymbol(monacoApi: typeof import("monaco-editor"), symbol: DocumentSymbol): monaco.languages.DocumentSymbol {
  return {
    name: symbol.name,
    detail: symbol.detail ?? "",
    kind: symbol.kind as monaco.languages.SymbolKind,
    tags: [],
    range: toRange(monacoApi, symbol.range),
    selectionRange: toRange(monacoApi, symbol.selectionRange),
    children: (symbol.children ?? []).map((child) => toDocumentSymbol(monacoApi, child)),
  };
}
