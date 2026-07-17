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

import { GedcomDocument } from "@domorium/validator";

import { levelFolding } from "./libs/folding/levelFolding";
import { legend, semanticTokens } from "./libs/semantic/semanticTokens";
import { levelIndent } from "./libs/indent/levelIndent";
import { findDefinitionRanges } from "./libs/definition/definition";
import { getHover } from "./libs/hover/hover";
import { documentSymbols } from "./libs/symbols/documentSymbols";
import { getCompletionItems } from "./libs/completion/completion";

export const createServer = (connection: Connection) => {
  const documents = new TextDocuments(TextDocument);
  const cache = new Map<string, GedcomDocument>();

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
          legend,
          range: false,
          full: true,
        },
      },
    } satisfies InitializeResult;
  });

  connection.languages.inlayHint.on((params: InlayHintParams): InlayHint[] => {
    const parsed = cache.get(params.textDocument.uri);
    if (!parsed) {
      return [];
    }
    return levelIndent(parsed.getNodes());
  });

  connection.onDefinition((params: DefinitionParams): Location[] => {
    const parsed = cache.get(params.textDocument.uri);
    if (!parsed) {
      return [];
    }
    const ranges = findDefinitionRanges(
      parsed.getNodes(),
      parsed.pointers,
      params.position,
    );
    return ranges.map((range) => ({ uri: params.textDocument.uri, range }));
  });

  connection.onHover((params: HoverParams): Hover | null => {
    const parsed = cache.get(params.textDocument.uri);
    if (!parsed) {
      return null;
    }
    return getHover(parsed, parsed.getNodes(), params.position);
  });

  connection.onFoldingRanges((params): FoldingRange[] => {
    const parsed = cache.get(params.textDocument.uri);
    if (!parsed) {
      return [];
    }
    return levelFolding(parsed.getNodes());
  });

  connection.onDocumentSymbol(
    (params: DocumentSymbolParams): DocumentSymbol[] => {
      const parsed = cache.get(params.textDocument.uri);
      if (!parsed) {
        return [];
      }
      return documentSymbols(parsed.getNodes());
    },
  );

  connection.languages.semanticTokens.on((params) => {
    const parsed = cache.get(params.textDocument.uri);
    if (!parsed) {
      return { data: [] };
    }

    const tokens = semanticTokens(parsed.getNodes());

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
    const parsed = cache.get(params.textDocument.uri);
    const textDocument = documents.get(params.textDocument.uri);
    if (!parsed || !textDocument) {
      return [];
    }

    const lineText = textDocument.getText({
      start: { line: params.position.line, character: 0 },
      end: params.position,
    });
    return getCompletionItems(parsed, params.position, lineText);
  });

  documents.onDidChangeContent(async (change) => {
    const gedcomDocument = new GedcomDocument();
    gedcomDocument.createDocument(change.document.getText());
    cache.set(change.document.uri, gedcomDocument);
    const errs = gedcomDocument.getErrors();
    const diagnostics: Diagnostic[] = errs.map((err) => ({
      ...err,
      severity:
        err.level === "error"
          ? DiagnosticSeverity.Error
          : err.level === "warning"
            ? DiagnosticSeverity.Warning
            : DiagnosticSeverity.Information,
    }));
    await connection.sendDiagnostics({ uri: change.document.uri, diagnostics });
  });

  documents.listen(connection);
  connection.listen();
};
