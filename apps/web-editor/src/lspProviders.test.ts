import { describe, expect, it, vi } from "vitest";
import { CompletionItemKind } from "vscode-languageserver-protocol";
import { registerLspProviders, toMonacoCompletionItems } from "./lspProviders";

const monacoApi = {
  languages: {
    CompletionItemKind: {
      Field: 4,
      EnumMember: 12,
      Reference: 17,
      Text: 18,
    },
  },
} as never;

const range = { startLineNumber: 1, startColumn: 3, endLineNumber: 1, endColumn: 3 } as never;

describe("toMonacoCompletionItems", () => {
  it("preserves labels and maps LSP completion kinds", () => {
    const items = toMonacoCompletionItems(
      monacoApi,
      [
        { label: "BIRT", kind: CompletionItemKind.Field, detail: "Birth" },
        { label: "F", kind: CompletionItemKind.EnumMember },
        { label: "@I1@", kind: CompletionItemKind.Reference },
      ],
      range,
    );

    expect(items.map(({ label, kind }) => ({ label, kind }))).toEqual([
      { label: "BIRT", kind: 4 },
      { label: "F", kind: 12 },
      { label: "@I1@", kind: 17 },
    ]);
  });

  it("accepts CompletionList and null responses", () => {
    expect(toMonacoCompletionItems(monacoApi, { isIncomplete: false, items: [{ label: "M" }] }, range)).toHaveLength(1);
    expect(toMonacoCompletionItems(monacoApi, null, range)).toEqual([]);
  });
});

describe("reference editing providers", () => {
  it("registers providers and maps LSP requests at the coordinate boundary", async () => {
    const registered: Record<string, unknown> = {};
    class Range {
      constructor(
        public startLineNumber: number,
        public startColumn: number,
        public endLineNumber: number,
        public endColumn: number,
      ) {}
    }
    class Position {
      constructor(public lineNumber: number, public column: number) {}
    }
    const languages = {
      CompletionItemKind: { Field: 4, EnumMember: 12, Reference: 17, Text: 18 },
      DocumentHighlightKind: { Read: 1, Write: 2 },
      registerCompletionItemProvider: vi.fn(),
      registerHoverProvider: vi.fn(),
      registerDefinitionProvider: vi.fn(),
      registerDocumentSymbolProvider: vi.fn(),
      registerFoldingRangeProvider: vi.fn(),
      registerInlayHintsProvider: vi.fn(),
      registerReferenceProvider: vi.fn((_id, provider) => {
        registered.references = provider;
      }),
      registerDocumentHighlightProvider: vi.fn((_id, provider) => {
        registered.highlights = provider;
      }),
      registerRenameProvider: vi.fn((_id, provider) => {
        registered.rename = provider;
      }),
      registerLinkProvider: vi.fn((_id, provider) => {
        registered.links = provider;
      }),
      registerCodeActionProvider: vi.fn((_id, provider) => {
        registered.codeActions = provider;
      }),
    };
    const api = {
      languages,
      Range,
      Position,
      Uri: { parse: (value: string) => ({ toString: () => value }) },
    } as never;
    const requests: { method: string; params: unknown }[] = [];
    const responses: Record<string, unknown> = {
      "textDocument/references": [
        {
          uri: "file:///a.ged",
          range: {
            start: { line: 1, character: 2 },
            end: { line: 1, character: 6 },
          },
        },
      ],
      "textDocument/documentHighlight": [
        {
          kind: 3,
          range: {
            start: { line: 1, character: 2 },
            end: { line: 1, character: 6 },
          },
        },
      ],
      "textDocument/prepareRename": {
        range: {
          start: { line: 1, character: 2 },
          end: { line: 1, character: 6 },
        },
        placeholder: "@I1@",
      },
      "textDocument/rename": {
        documentChanges: [
          {
            textDocument: { uri: "file:///a.ged", version: 4 },
            edits: [
              {
                range: {
                  start: { line: 1, character: 2 },
                  end: { line: 1, character: 6 },
                },
                newText: "@I2@",
              },
            ],
          },
        ],
      },
      "textDocument/documentLink": [
        {
          range: {
            start: { line: 2, character: 7 },
            end: { line: 2, character: 19 },
          },
          target: "https://example.com",
        },
      ],
      "textDocument/codeAction": [
        {
          title: "Create INDI record @I9@",
          kind: "quickfix",
          edit: {
            documentChanges: [
              {
                textDocument: { uri: "file:///a.ged", version: 4 },
                edits: [
                  {
                    range: {
                      start: { line: 3, character: 0 },
                      end: { line: 3, character: 0 },
                    },
                    newText: "0 @I9@ INDI\n",
                  },
                ],
              },
            ],
          },
        },
      ],
    };
    const connection = {
      sendRequest: vi.fn(async (type: { method: string }, params: unknown) => {
        requests.push({ method: type.method, params });
        const response = responses[type.method];
        if (response instanceof Error) {
          throw response;
        }
        return response ?? [];
      }),
    } as never;
    registerLspProviders(api, connection, undefined);

    const model = {
      uri: { toString: () => "file:///a.ged" },
      getValueInRange: () => "@I1@",
    } as never;
    const token = { isCancellationRequested: false } as never;
    const references = registered.references as {
      provideReferences: (
        model: unknown,
        position: unknown,
        context: unknown,
        token: unknown,
      ) => Promise<{ range: unknown }[]>;
    };
    const result = await references.provideReferences(
      model,
      { lineNumber: 2, column: 4 },
      { includeDeclaration: true },
      token,
    );
    expect(requests[0]).toEqual({
      method: "textDocument/references",
      params: {
        textDocument: { uri: "file:///a.ged" },
        position: { line: 1, character: 3 },
        context: { includeDeclaration: true },
      },
    });
    expect(result[0].range).toEqual(new Range(2, 3, 2, 7));

    const highlights = registered.highlights as {
      provideDocumentHighlights: (
        model: unknown,
        position: unknown,
        token: unknown,
      ) => Promise<unknown>;
    };
    expect(
      await highlights.provideDocumentHighlights(
        model,
        { lineNumber: 2, column: 4 },
        token,
      ),
    ).toEqual([{ range: new Range(2, 3, 2, 7), kind: 2 }]);
    expect(languages.registerRenameProvider).toHaveBeenCalledOnce();
    expect(languages.registerLinkProvider).toHaveBeenCalledOnce();
    expect(languages.registerCodeActionProvider).toHaveBeenCalledWith(
      "gedcom",
      expect.anything(),
      { providedCodeActionKinds: ["quickfix"] },
    );

    const rename = registered.rename as {
      resolveRenameLocation: (
        model: unknown,
        position: unknown,
        token: unknown,
      ) => Promise<{ text: string; range: unknown }>;
      provideRenameEdits: (
        model: unknown,
        position: unknown,
        newName: string,
        token: unknown,
      ) => Promise<{ edits: { versionId?: number }[] }>;
    };
    expect(
      await rename.resolveRenameLocation(
        model,
        { lineNumber: 2, column: 4 },
        token,
      ),
    ).toEqual({ text: "@I1@", range: new Range(2, 3, 2, 7) });
    expect(
      await rename.provideRenameEdits(
        model,
        { lineNumber: 2, column: 4 },
        "@I2@",
        token,
      ),
    ).toMatchObject({ edits: [{ versionId: 4 }] });

    const links = registered.links as {
      provideLinks: (
        model: unknown,
        token: unknown,
      ) => Promise<{ links: { url?: { toString(): string } }[] }>;
    };
    expect((await links.provideLinks(model, token)).links[0].url?.toString()).toBe(
      "https://example.com",
    );
    responses["textDocument/documentLink"] = [
      {
        range: {
          start: { line: 2, character: 7 },
          end: { line: 2, character: 19 },
        },
        target: "file:///private/portrait.jpg",
        tooltip: "Open file: portrait.jpg",
      },
    ];
    expect((await links.provideLinks(model, token)).links[0]).toMatchObject({
      url: undefined,
      tooltip: "Open file: portrait.jpg",
    });

    const codeActions = registered.codeActions as {
      provideCodeActions: (
        model: unknown,
        range: unknown,
        context: unknown,
        token: unknown,
      ) => Promise<{
        actions: { title: string; edit?: { edits: unknown[] } }[];
      }>;
    };
    expect(
      await codeActions.provideCodeActions(
        model,
        new Range(3, 8, 3, 12),
        {
          markers: [
            {
              startLineNumber: 3,
              startColumn: 8,
              endLineNumber: 3,
              endColumn: 12,
              message: "unresolved",
              code: "unresolved-xref",
            },
          ],
        },
        token,
      ),
    ).toMatchObject({
      actions: [
        {
          title: "Create INDI record @I9@",
          edit: { edits: [expect.objectContaining({ versionId: 4 })] },
        },
      ],
    });
    expect(requests.map(({ method }) => method)).toEqual(
      expect.arrayContaining([
        "textDocument/prepareRename",
        "textDocument/rename",
        "textDocument/documentLink",
        "textDocument/codeAction",
      ]),
    );

    responses["textDocument/rename"] = {
      documentChanges: [
        {
          textDocument: { uri: "file:///a.ged", version: 4 },
          edits: [],
        },
        { kind: "delete", uri: "file:///other.ged" },
      ],
    };
    expect(
      await rename.provideRenameEdits(
        model,
        { lineNumber: 2, column: 4 },
        "@I2@",
        token,
      ),
    ).toEqual({
      edits: [],
      rejectReason: "The server returned an unsupported workspace edit.",
    });

    responses["textDocument/rename"] = {
      changes: { "file:///a.ged": [] },
    };
    expect(
      await rename.provideRenameEdits(
        model,
        { lineNumber: 2, column: 4 },
        "@I2@",
        token,
      ),
    ).toMatchObject({
      edits: [],
      rejectReason: "The server returned an unversioned workspace edit.",
    });

    responses["textDocument/rename"] = {
      documentChanges: [
        {
          textDocument: { uri: "file:///a.ged", version: null },
          edits: [],
        },
      ],
    };
    expect(
      await rename.provideRenameEdits(
        model,
        { lineNumber: 2, column: 4 },
        "@I2@",
        token,
      ),
    ).toMatchObject({
      edits: [],
      rejectReason: "The server returned an unsupported workspace edit.",
    });

    responses["textDocument/prepareRename"] = new Error(
      "Duplicate declarations cannot be renamed.",
    );
    expect(
      await rename.resolveRenameLocation(
        model,
        { lineNumber: 2, column: 4 },
        token,
      ),
    ).toMatchObject({
      rejectReason: "Duplicate declarations cannot be renamed.",
    });
    expect(
      (
        connection as unknown as {
          sendRequest: ReturnType<typeof vi.fn>;
        }
      ).sendRequest,
    ).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      token,
    );
  });
});
