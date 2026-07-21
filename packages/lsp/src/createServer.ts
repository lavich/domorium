import type {
  CompletionItem,
  CompletionParams,
  Connection,
  DefinitionParams,
  Diagnostic,
  DocumentSymbol,
  DocumentSymbolParams,
  FoldingRange,
  Hover,
  HoverParams,
  InlayHintParams,
  Location,
} from "vscode-languageserver";
import {
  DiagnosticSeverity,
  SemanticTokensBuilder,
  TextDocumentSyncKind,
  TextDocuments,
} from "vscode-languageserver";
import type {
  InitializeResult,
  InlayHint,
} from "vscode-languageserver-protocol";
import { TextDocument } from "vscode-languageserver-textdocument";

import {
  GedcomLanguageService,
  semanticTokenLegend,
} from "@domorium/language-service";

export const createServer = (connection: Connection) => {
  const documents = new TextDocuments(TextDocument);
  const cache = new Map<string, GedcomLanguageService>();

  connection.onInitialize(() => {
    return {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental,
        inlayHintProvider: true,
        foldingRangeProvider: true,
        definitionProvider: true,
        hoverProvider: true,
        documentSymbolProvider: true,
        completionProvider: {
          triggerCharacters: [" "],
        },
        semanticTokensProvider: {
          legend: semanticTokenLegend,
          range: false,
          full: true,
        },
      },
    } satisfies InitializeResult;
  });

  connection.languages.inlayHint.on((params: InlayHintParams): InlayHint[] => {
    const service = cache.get(params.textDocument.uri);
    if (!service) {
      return [];
    }
    return service.getInlayHints();
  });

  connection.onDefinition((params: DefinitionParams): Location[] => {
    const service = cache.get(params.textDocument.uri);
    if (!service) {
      return [];
    }
    return service
      .getDefinitionRanges(params.position)
      .map((range) => ({ uri: params.textDocument.uri, range }));
  });

  connection.onHover((params: HoverParams): Hover | null => {
    const service = cache.get(params.textDocument.uri);
    if (!service) {
      return null;
    }
    return service.getHover(params.position);
  });

  connection.onFoldingRanges((params): FoldingRange[] => {
    const service = cache.get(params.textDocument.uri);
    if (!service) {
      return [];
    }
    return service.getFoldingRanges();
  });

  connection.onDocumentSymbol(
    (params: DocumentSymbolParams): DocumentSymbol[] => {
      const service = cache.get(params.textDocument.uri);
      if (!service) {
        return [];
      }
      return service.getDocumentSymbols();
    },
  );

  connection.languages.semanticTokens.on((params) => {
    const service = cache.get(params.textDocument.uri);
    if (!service) {
      return { data: [] };
    }

    const tokens = service.getSemanticTokens();

    const builder = new SemanticTokensBuilder();
    tokens.forEach((token) =>
      builder.push(
        token.line,
        token.char,
        token.length,
        token.tokenType,
        token.tokenModifiers,
      ),
    );
    return {
      data: builder.build().data,
    };
  });

  connection.onCompletion((params: CompletionParams): CompletionItem[] => {
    const service = cache.get(params.textDocument.uri);
    if (!service) {
      return [];
    }
    return service.getCompletionItems(params.position);
  });

  documents.onDidChangeContent(async (change) => {
    const service = new GedcomLanguageService(change.document.getText());
    cache.set(change.document.uri, service);
    const diagnostics: Diagnostic[] = service.getDiagnostics().map((diagnostic) => ({
      ...diagnostic,
      severity:
        diagnostic.severity === "error"
          ? DiagnosticSeverity.Error
          : diagnostic.severity === "warning"
            ? DiagnosticSeverity.Warning
            : DiagnosticSeverity.Information,
    }));
    await connection.sendDiagnostics({ uri: change.document.uri, diagnostics });
  });

  documents.listen(connection);
  connection.listen();
};
