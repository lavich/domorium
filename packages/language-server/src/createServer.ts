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
  Range,
  SemanticTokens,
  RenameParams,
  DocumentLink,
  DocumentLinkParams,
  CodeAction,
  CodeActionParams,
  RenameFilesParams,
  TextDocumentEdit,
  WorkspaceEdit,
  WorkspaceFolder,
} from "vscode-languageserver";
import {
  CodeActionKind,
  DocumentHighlightKind,
  DiagnosticSeverity,
  ErrorCodes,
  MarkupKind,
  MessageType,
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
  decodeFileTarget,
  semanticTokenLegend,
  type MediaReference,
  type OffsetRange,
} from "@domorium/language-service";

import { pathFromDocument } from "./pathFromDocument";

/** As much as the CodeMirror hosts show by default, so the two agree. */
const HOVER_MAX_LINES = 24;

const offsetRange = (document: TextDocument, range: Range): OffsetRange => ({
  from: document.offsetAt(range.start),
  to: document.offsetAt(range.end),
});

const semanticTokens = (
  service: GedcomLanguageService,
  range?: OffsetRange,
): SemanticTokens => {
  const builder = new SemanticTokensBuilder();
  service
    .getSemanticTokens(range)
    .forEach((token) =>
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
};

export const createServer = (connection: Connection) => {
  const documents = new TextDocuments(TextDocument);
  const cache = new Map<string, GedcomLanguageService>();
  let workspaceFolders: WorkspaceFolder[] = [];
  let insertReplaceSupport = false;
  let semanticTokensByRange = false;

  connection.onInitialize((params) => {
    workspaceFolders =
      params.workspaceFolders ??
      (params.rootUri ? [{ uri: params.rootUri, name: "" }] : []);
    insertReplaceSupport =
      params.capabilities?.textDocument?.completion?.completionItem
        ?.insertReplaceSupport === true;
    semanticTokensByRange = Boolean(
      params.capabilities?.textDocument?.semanticTokens?.requests?.range,
    );
    return {
      capabilities: {
        workspace: {
          fileOperations: {
            willRename: {
              filters: [{ pattern: { glob: "**/*", matches: "file" } }],
            },
          },
        },
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
        semanticTokensProvider: semanticTokensByRange
          ? { legend: semanticTokenLegend, range: true }
          : { legend: semanticTokenLegend, range: false, full: true },
      },
    } satisfies InitializeResult;
  });

  connection.languages.inlayHint.on((params: InlayHintParams): InlayHint[] => {
    const service = cache.get(params.textDocument.uri);
    const document = documents.get(params.textDocument.uri);
    if (!service || !document) {
      return [];
    }
    return service.getInlayHints(offsetRange(document, params.range));
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
    if (!service) {
      return [];
    }
    return service
      .getReferences(params.position, {
        includeDeclaration: params.context.includeDeclaration,
      })
      .map((range) => ({ uri: params.textDocument.uri, range }));
  });

  connection.onDocumentHighlight(
    (params: DocumentHighlightParams): DocumentHighlight[] => {
      const service = cache.get(params.textDocument.uri);
      if (!service) {
        return [];
      }
      return service
        .getDocumentHighlights(params.position)
        .map((highlight) => ({
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
    if (!service || !document) {
      return null;
    }
    const result = service.prepareRename(params.position);
    if (!result.ok) {
      throw new ResponseError(
        ErrorCodes.InvalidRequest,
        result.message,
        result.code,
      );
    }
    return { range: result.range, placeholder: result.placeholder };
  });

  connection.onRenameRequest((params: RenameParams): WorkspaceEdit | null => {
    const service = cache.get(params.textDocument.uri);
    const document = documents.get(params.textDocument.uri);
    if (!service || !document) {
      return null;
    }
    const result = service.rename(
      params.position,
      params.newName,
      document.version,
    );
    if (!result.ok) {
      throw new ResponseError(
        ErrorCodes.InvalidRequest,
        result.message,
        result.code,
      );
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

  connection.workspace.onWillRenameFiles(
    (params: RenameFilesParams): WorkspaceEdit | null => {
      const renamedTo = new Map(
        params.files.map(({ oldUri, newUri }) => [oldUri, newUri]),
      );
      const changes: TextDocumentEdit[] = [];
      const stranded: string[] = [];
      for (const document of documents.all()) {
        const service =
          cache.get(document.uri) ??
          new GedcomLanguageService(document.getText(), document.version);
        const documentAfter = renamedTo.get(document.uri) ?? document.uri;
        const named = namesLinked(service);
        const edits = [];
        for (const { oldUri, newUri } of params.files) {
          const from = pathFromDocument(document.uri, oldUri);
          if (from === undefined || !named.has(lastSegment(from))) {
            continue;
          }
          const to = pathFromDocument(documentAfter, newUri);
          if (from === to) {
            continue;
          }
          const result =
            to === undefined
              ? service.moveFileLinks(from, from)
              : service.moveFileLinks(from, to);
          if (result.ok && result.edit.edits.length === 0) {
            continue;
          }
          if (!result.ok || to === undefined) {
            stranded.push(
              `${displayPath(document.uri)} (${displayPath(oldUri)})`,
            );
            edits.length = 0;
            break;
          }
          edits.push(...result.edit.edits);
        }
        if (edits.length > 0) {
          changes.push({
            textDocument: { uri: document.uri, version: document.version },
            edits,
          });
        }
      }
      if (stranded.length > 0) {
        void connection.sendNotification("window/showMessage", {
          type: MessageType.Warning,
          message: `These GEDCOM documents cannot name the renamed file in its new place and were left unchanged: ${stranded.join(", ")}.`,
        });
      }
      return changes.length > 0 ? { documentChanges: changes } : null;
    },
  );

  function displayPath(uri: string): string {
    for (const folder of workspaceFolders) {
      const path = pathFromDocument(`${folder.uri.replace(/\/$/u, "")}/_`, uri);
      if (path !== undefined && path !== ".." && !path.startsWith("../")) {
        return path;
      }
    }
    return uri;
  }

  connection.onDocumentLinks((params: DocumentLinkParams): DocumentLink[] => {
    const service = cache.get(params.textDocument.uri);
    if (!service) {
      return [];
    }
    return service.getDocumentLinks().map((link) => ({
      range: link.range,
      target: resolveLinkTarget(params.textDocument.uri, link),
      tooltip:
        link.kind === "http"
          ? link.targetText
          : `Open file: ${link.targetText}`,
    }));
  });

  connection.onCodeAction((params: CodeActionParams): CodeAction[] => {
    const service = cache.get(params.textDocument.uri);
    const document = documents.get(params.textDocument.uri);
    if (!service || !document) {
      return [];
    }
    const currentDiagnostics = service.getDiagnostics();
    const diagnostics = params.context.diagnostics.map((diagnostic) => {
      const code = String(diagnostic.code ?? "");
      // Compared as well as stored: against a markup message the old string
      // comparison never matched, so no code action found its diagnostic.
      const message =
        typeof diagnostic.message === "string"
          ? diagnostic.message
          : diagnostic.message.value;
      return (
        currentDiagnostics.find(
          (current) =>
            current.code === code &&
            current.message === message &&
            JSON.stringify(current.range) === JSON.stringify(diagnostic.range),
        ) ?? {
          code,
          message,
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
    if (!Array.isArray(result)) {
      return [];
    }
    return result.flatMap((action) => {
      const edits = action.edit
        ? [
            toCodeAction(
              action.title,
              params.textDocument.uri,
              action.edit,
              params.context.diagnostics,
            ),
          ]
        : [];
      const choices = (action.choices ?? []).map((choice) =>
        toCodeAction(
          choice.title,
          params.textDocument.uri,
          choice.edit,
          params.context.diagnostics,
        ),
      );
      return [...edits, ...choices];
    });
  });

  connection.onHover((params: HoverParams): Hover | null => {
    const service = cache.get(params.textDocument.uri);
    if (!service) {
      return null;
    }
    const media = service.getMediaAt(params.position);
    const image = media && imageMarkdown(media, params.textDocument.uri);
    const document = documents.get(params.textDocument.uri);
    if (document) {
      const preview = service.getRecordPreview(params.position, {
        maxLines: HOVER_MAX_LINES,
      });
      if (preview) {
        const record = fenced(document.getText(preview.range));
        return {
          contents: {
            kind: MarkupKind.Markdown,
            value: image ? `${record}\n\n${image}` : record,
          },
          range: preview.pointer,
        };
      }
    }
    if (media && image) {
      return {
        contents: { kind: MarkupKind.Markdown, value: image },
        range: media.range,
      };
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
    return semanticTokens(service);
  });

  connection.languages.semanticTokens.onRange((params) => {
    const service = cache.get(params.textDocument.uri);
    const document = documents.get(params.textDocument.uri);
    if (!service || !document) {
      return { data: [] };
    }
    return semanticTokens(service, offsetRange(document, params.range));
  });

  connection.onCompletion((params: CompletionParams): CompletionItem[] => {
    const service = cache.get(params.textDocument.uri);
    if (!service) {
      return [];
    }
    return service
      .getCompletionItems(params.position)
      .map(({ textEdit, ...item }) => ({
        ...item,
        textEdit: insertReplaceSupport
          ? textEdit
          : { range: textEdit.replace, newText: textEdit.newText },
      }));
  });

  documents.onDidChangeContent(async (change) => {
    const service = new GedcomLanguageService(
      change.document.getText(),
      change.document.version,
    );
    cache.set(change.document.uri, service);
    const diagnostics: Diagnostic[] = service
      .getDiagnostics()
      .map((diagnostic) => ({
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

  documents.onDidClose(({ document }) => {
    cache.delete(document.uri);
  });

  documents.listen(connection);
  connection.listen();
};

function namesLinked(service: GedcomLanguageService): Set<string> {
  const dialect = service.getDocument().getDialect();
  return new Set(
    service
      .getDocumentLinks()
      .filter((link) => link.kind === "file-relative")
      .map((link) => lastSegment(decodeFileTarget(link.targetText, dialect))),
  );
}

function lastSegment(path: string): string {
  return path.split(/[/\\]/u).at(-1) ?? "";
}

/** A NOTE carries arbitrary text, so a record can hold a fence of its own. */
function fenced(record: string): string {
  const backticks = [...record.matchAll(/`+/gu)].map(([run]) => run.length);
  const rail = "`".repeat(Math.max(3, ...backticks.map((run) => run + 1)));
  return `${rail}gedcom\n${record}\n${rail}`;
}

/**
 * A hover renders Markdown, so the whole image reaches VS Code and JetBrains
 * without a request of their own. Neither can apply the crop — a hover has no
 * CSS — so what they get is the picture, not the rectangle of it.
 */
function imageMarkdown(
  media: MediaReference,
  documentUri: string,
): string | undefined {
  if (media.mediaKind !== "image") {
    return undefined;
  }
  const target = resolveLinkTarget(documentUri, media);
  if (!target) {
    return undefined;
  }
  // Parentheses would close the Markdown link early.
  const url = target.replace(/[()]/gu, encodeURIComponent);
  return `![${media.title?.replace(/[[\]]/gu, "") ?? ""}](${url})`;
}

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
  edit: {
    version: number;
    edits: { range: import("vscode-languageserver").Range; newText: string }[];
  },
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
