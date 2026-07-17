import { describe, expect, it } from "vitest";
import { SymbolKind } from "vscode-languageserver-types";
import { documentSymbols } from "./documentSymbols";
import { GedcomDocument } from "@domorium/validator";

const gedcomDocument = new GedcomDocument();
gedcomDocument.createDocument(`0 @I1@ INDI
1 NAME Homer /Simpson/
1 SEX M`);

describe("documentSymbols", () => {
  it("builds a nested symbol tree from AST levels", () => {
    const res = documentSymbols(gedcomDocument.getNodes());

    expect(res).toStrictEqual([
      {
        name: "INDI",
        detail: "@I1@",
        kind: SymbolKind.Object,
        range: {
          start: { line: 0, character: 0 },
          end: { line: 2, character: 7 },
        },
        selectionRange: {
          start: { line: 0, character: 7 },
          end: { line: 0, character: 11 },
        },
        children: [
          {
            name: "NAME",
            detail: "Homer /Simpson/",
            kind: SymbolKind.Field,
            range: {
              start: { line: 1, character: 0 },
              end: { line: 1, character: 22 },
            },
            selectionRange: {
              start: { line: 1, character: 2 },
              end: { line: 1, character: 6 },
            },
            children: [],
          },
          {
            name: "SEX",
            detail: "M",
            kind: SymbolKind.Field,
            range: {
              start: { line: 2, character: 0 },
              end: { line: 2, character: 7 },
            },
            selectionRange: {
              start: { line: 2, character: 2 },
              end: { line: 2, character: 5 },
            },
            children: [],
          },
        ],
      },
    ]);
  });
});
