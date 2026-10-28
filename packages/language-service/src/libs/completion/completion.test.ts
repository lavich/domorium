import { describe, expect, it } from "vitest";
import { CompletionItemKind, type Range } from "../../types";
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
  });
});

const G7_HEAD = [
  "0 HEAD",
  "1 GEDC",
  "2 VERS 7.0",
  "0 @I1@ INDI",
  "0 @I2@ INDI",
];
const G551_HEAD = [
  "0 HEAD",
  "1 GEDC",
  "2 VERS 5.5.1",
  "3 FORM LINEAGE-LINKED",
  "1 CHAR UTF-8",
];

/** The edits offered with the cursor at `|` in the last of `lines`. */
function editsAt(lines: string[]) {
  const marked = lines[lines.length - 1];
  const character = marked.indexOf("|");
  const lineText = marked.replace("|", "");
  const position = { line: lines.length - 1, character };
  const document = new GedcomDocument().createDocument(
    [...lines.slice(0, -1), lineText, "0 TRLR", ""].join("\n"),
  );
  const span = (range: Range) =>
    lineText.slice(range.start.character, range.end.character);
  return new Map(
    getCompletionItems(document, position, lineText).map((item) => {
      const { newText, insert, replace } = item.textEdit;
      for (const range of [insert, replace]) {
        expect([range.start.line, range.end.line]).toEqual([
          position.line,
          position.line,
        ]);
      }
      return [
        item.label,
        { newText, insert: span(insert), replace: span(replace) },
      ];
    }),
  );
}

describe("the text a completion replaces", () => {
  it("takes an at-sign already typed, so the xref is not written as @@I1@", () => {
    const edit = editsAt([...G7_HEAD, "0 @F1@ FAM", "1 HUSB @I|"]).get("@I1@");

    expect(edit).toEqual({ newText: "@I1@", insert: "@I", replace: "@I" });
  });

  it("replaces the whole xref around the cursor, so @I2@ is not written as @I2@1@", () => {
    const edit = editsAt([...G7_HEAD, "0 @F1@ FAM", "1 HUSB @I|1@"]).get(
      "@I2@",
    );

    expect(edit).toMatchObject({ insert: "@I", replace: "@I1@" });
  });

  it("takes a calendar escape from its @#", () => {
    const edit = editsAt([
      ...G551_HEAD,
      "0 @I1@ INDI",
      "1 BIRT",
      "2 DATE @#DJ|",
    ]).get("@#DJULIAN@");

    expect(edit).toMatchObject({ insert: "@#DJ", replace: "@#DJ" });
  });

  it("keeps the space in @#DFRENCH R@ inside the token", () => {
    const edit = editsAt([
      ...G551_HEAD,
      "0 @I1@ INDI",
      "1 BIRT",
      "2 DATE @#DFRE|NCH R@ 1 VEND 3",
    ]).get("@#DJULIAN@");

    expect(edit).toMatchObject({ insert: "@#DFRE", replace: "@#DFRENCH R@" });
  });

  it("replaces nothing after a space with nothing typed", () => {
    const edits = [...editsAt([...G7_HEAD, "0 @I3@ INDI", "1 SEX |"]).values()];

    expect(edits).not.toHaveLength(0);
    for (const edit of edits) {
      expect(edit).toMatchObject({ insert: "", replace: "" });
    }
  });

  it("ends an escape at its own @, so BET @#DJ AND @#DGREGORIAN@ keeps its second calendar", () => {
    const edit = editsAt([
      ...G551_HEAD,
      "0 @I1@ INDI",
      "1 BIRT",
      "2 DATE BET @#DJ| AND @#DGREGORIAN@ 1800",
    ]).get("@#DJULIAN@");

    expect(edit).toMatchObject({ insert: "@#DJ", replace: "@#DJ" });
  });

  it("takes a whole escape with the cursor on its first @, so FRENCH R is not cut at its space", () => {
    const edit = editsAt([
      ...G551_HEAD,
      "0 @I1@ INDI",
      "1 BIRT",
      "2 DATE |@#DFRENCH R@ 1 VEND 3",
    ]).get("@#DJULIAN@");

    expect(edit).toMatchObject({ insert: "", replace: "@#DFRENCH R@" });
  });

  it("replaces the rest of BIRT, so it is not written as BIRTRT", () => {
    const edit = editsAt([...G7_HEAD, "0 @I3@ INDI", "1 BI|RT"]).get("BIRT");

    expect(edit).toMatchObject({ insert: "BI", replace: "BIRT" });
  });

  it("stops a value in a list at its comma", () => {
    const edit = editsAt([
      ...G7_HEAD,
      "0 @I3@ INDI",
      "1 RESN CONFIDENTIAL, LO|",
    ]).get("LOCKED");

    expect(edit).toMatchObject({ insert: "LO", replace: "LO" });
  });
});
