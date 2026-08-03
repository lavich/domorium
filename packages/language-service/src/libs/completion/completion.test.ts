import { describe, expect, it } from "vitest";
import { CompletionItemKind } from "../../types";
import { GedcomDocument } from "@domorium/validator";
import { getCompletionItems } from "./completion";

describe("getCompletionItems", () => {
  it("maps GEDCOM completions to LSP kinds without changing labels", () => {
    const document = new GedcomDocument().createDocument(`0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 SEX
0 TRLR
`);

    const items = getCompletionItems(
      document,
      { line: 4, character: 6 },
      "1 SEX ",
    );

    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "M",
          kind: CompletionItemKind.EnumMember,
        }),
        expect.objectContaining({
          label: "F",
          kind: CompletionItemKind.EnumMember,
        }),
      ]),
    );
    expect(items.every((item) => !("insertText" in item))).toBe(true);
  });
});
