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
      if (!result) return null;

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
      if (!locations?.length) return null;
      return locations.map((location) => ({
        uri: monacoApi.Uri.parse(location.uri),
        range: toRange(monacoApi, location.range),
      }));
    },
  });

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
