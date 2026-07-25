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
  ReferenceParams,
  DocumentHighlight,
  DocumentHighlightParams,
  PrepareRenameParams,
  RenameParams,
  DocumentLink,
  DocumentLinkParams,
  CodeAction,
  CodeActionParams,
  WorkspaceEdit,
} from "vscode-languageserver";
import {
  CodeActionKind,
  DocumentHighlightKind,
  DiagnosticSeverity,
  ErrorCodes,
  ResponseError,
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
} from "gedcom-language-service";

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
        referencesProvider: true,
        documentHighlightProvider: true,
        renameProvider: { prepareProvider: true },
        documentLinkProvider: { resolveProvider: false },
        codeActionProvider: { codeActionKinds: [CodeActionKind.QuickFix] },
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

  connection.onReferences((params: ReferenceParams): Location[] => {
    const service = cache.get(params.textDocument.uri);
    if (!service) return [];
    return service
      .getReferences(params.position, {
        includeDeclaration: params.context.includeDeclaration,
      })
      .map((range) => ({ uri: params.textDocument.uri, range }));
  });

  connection.onDocumentHighlight(
    (params: DocumentHighlightParams): DocumentHighlight[] => {
      const service = cache.get(params.textDocument.uri);
      if (!service) return [];
      return service.getDocumentHighlights(params.position).map((highlight) => ({
        range: highlight.range,
        kind:
          highlight.kind === "write"
            ? DocumentHighlightKind.Write
            : DocumentHighlightKind.Read,
      }));
    },
  );

  connection.onPrepareRename((params: PrepareRenameParams) => {
    const service = cache.get(params.textDocument.uri);
    const document = documents.get(params.textDocument.uri);
    if (!service || !document) return null;
    const result = service.prepareRename(params.position);
    if (!result.ok) {
      throw new ResponseError(ErrorCodes.InvalidRequest, result.message, result.code);
    }
    return { range: result.range, placeholder: result.placeholder };
  });

  connection.onRenameRequest((params: RenameParams): WorkspaceEdit | null => {
    const service = cache.get(params.textDocument.uri);
    const document = documents.get(params.textDocument.uri);
    if (!service || !document) return null;
    const result = service.rename(
      params.position,
      params.newName,
      document.version,
    );
    if (!result.ok) {
      throw new ResponseError(ErrorCodes.InvalidRequest, result.message, result.code);
    }
    return {
      documentChanges: [
        {
          textDocument: {
            uri: params.textDocument.uri,
            version: result.edit.version,
          },
          edits: result.edit.edits,
        },
      ],
    };
  });

  connection.onDocumentLinks((params: DocumentLinkParams): DocumentLink[] => {
    const service = cache.get(params.textDocument.uri);
    if (!service) return [];
    return service.getDocumentLinks().map((link) => ({
      range: link.range,
      target: resolveLinkTarget(params.textDocument.uri, link),
      tooltip:
        link.kind === "http" ? link.targetText : `Open file: ${link.targetText}`,
    }));
  });

  connection.onCodeAction((params: CodeActionParams): CodeAction[] => {
    const service = cache.get(params.textDocument.uri);
    const document = documents.get(params.textDocument.uri);
    if (!service || !document) return [];
    const currentDiagnostics = service.getDiagnostics();
    const diagnostics = params.context.diagnostics.map((diagnostic) => {
      const code = String(diagnostic.code ?? "");
      return (
        currentDiagnostics.find(
          (current) =>
            current.code === code &&
            current.message === diagnostic.message &&
            JSON.stringify(current.range) === JSON.stringify(diagnostic.range),
        ) ?? {
          code,
          message: diagnostic.message,
          range: diagnostic.range,
          severity: "error" as const,
        }
      );
    });
    const result = service.getCodeActions(
      params.range,
      diagnostics,
      document.version,
    );
    if (!Array.isArray(result)) return [];
    return result.flatMap((action) => {
      const edits = action.edit
        ? [toCodeAction(action.title, params.textDocument.uri, action.edit, params.context.diagnostics)]
        : [];
      const choices = (action.choices ?? []).map((choice) =>
        toCodeAction(choice.title, params.textDocument.uri, choice.edit, params.context.diagnostics),
      );
      return [...edits, ...choices];
    });
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
    const service = new GedcomLanguageService(
      change.document.getText(),
      change.document.version,
    );
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

function resolveLinkTarget(
  documentUri: string,
  link: ReturnType<GedcomLanguageService["getDocumentLinks"]>[number],
): string | undefined {
  if (link.kind === "http" || link.targetText.startsWith("file:")) {
    return link.targetText;
  }
  if (!documentUri.startsWith("file:") || link.targetText.includes("\\")) {
    return undefined;
  }
  try {
    return new URL(link.targetText, documentUri).toString();
  } catch {
    return undefined;
  }
}

function toCodeAction(
  title: string,
  uri: string,
  edit: { version: number; edits: { range: import("vscode-languageserver").Range; newText: string }[] },
  diagnostics: import("vscode-languageserver").Diagnostic[],
): CodeAction {
  return {
    title,
    kind: CodeActionKind.QuickFix,
    diagnostics,
    edit: {
      documentChanges: [
        {
          textDocument: { uri, version: edit.version },
          edits: edit.edits,
        },
      ],
    },
  };
}
