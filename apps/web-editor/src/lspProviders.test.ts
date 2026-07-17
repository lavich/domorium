import { describe, expect, it } from "vitest";
import { CompletionItemKind } from "vscode-languageserver-protocol";
import { toMonacoCompletionItems } from "./lspProviders";

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
