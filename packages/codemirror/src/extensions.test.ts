import { semanticTokenLegend } from "@domorium/language-service";
import { EditorState } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { describe, expect, it, vi } from "vitest";

import * as extensionsModule from "./extensions";
import {
  documentLinkTag,
  getDiagnosticActions,
  getDocumentLinkSpecs,
  getReferenceHighlightSpecs,
  tokenClass,
} from "./extensions";
import { EditorLanguageService } from "./service";

const text = [
  "0 HEAD",
  "1 GEDC",
  "2 VERS 7.0",
  "0 @I1@ INDI",
  "0 @F1@ FAM",
  "1 HUSB @I1@",
  "1 WIFE @I9@",
  "0 TRLR",
].join("\n");

describe("GEDCOM editor extensions", () => {
  it("keeps host editor keymaps out of the GEDCOM feature layer", () => {
    const createStandaloneEditorExtensions = Reflect.get(
      extensionsModule,
      "createStandaloneEditorExtensions",
    );
    expect(createStandaloneEditorExtensions).toBeTypeOf("function");

    const actions = { applyWorkspaceEdit: () => true };
    const gedcomState = EditorState.create({
      extensions: extensionsModule.createGedcomExtensions({
        actions,
        settings: { diagnostics: false },
      }),
    });
    const standaloneState = EditorState.create({
      extensions: createStandaloneEditorExtensions(),
    });

    const gedcomKeys = gedcomState
      .facet(keymap)
      .flat()
      .map((binding) => binding.key);
    const standaloneKeys = standaloneState
      .facet(keymap)
      .flat()
      .map((binding) => binding.key);

    expect(gedcomKeys).toContain("Ctrl-Space");
    expect(gedcomKeys).not.toContain("Tab");
    expect(standaloneKeys).toContain("Tab");
  });

  it("maps language-service semantic token types to CodeMirror theme tags", () => {
    expect("semanticTokenTag" in extensionsModule).toBe(true);
    const semanticTokenTag = Reflect.get(extensionsModule, "semanticTokenTag");
    expect(semanticTokenTag(0)).toBe(tags.comment);
    expect(semanticTokenTag(1)).toBe(tags.keyword);
    expect(semanticTokenTag(2)).toBe(tags.variableName);
    expect(semanticTokenTag(3)).toBe(tags.string);
  });

  // A declaration is a modified tag rather than a class of its own, so a host
  // says what one looks like in the highlight style it already writes.
  it("modifies the tag of a declaring token", () => {
    const semanticTokenTag = Reflect.get(extensionsModule, "semanticTokenTag");

    expect(semanticTokenTag(2, 0)).toBe(tags.variableName);
    expect(semanticTokenTag(2, 1)).toBe(tags.definition(tags.variableName));
    expect(semanticTokenTag(9, 1)).toBe(null);
  });

  it("maps declaration and use highlights at the selection", () => {
    const language = new EditorLanguageService();
    const declaration = text.indexOf("@I1@");
    const state = EditorState.create({
      doc: text,
      selection: { anchor: declaration + 1 },
    });

    expect(getReferenceHighlightSpecs(state, language)).toMatchObject([
      { kind: "write" },
      { kind: "read" },
    ]);
  });

  it("exposes safe language-service quick fixes as lint actions", () => {
    const language = new EditorLanguageService();
    language.update(text);
    const diagnostic = language.service
      .getDiagnostics()
      .find(({ code }) => code === "unresolved-xref")!;
    const apply = vi.fn(() => true);

    const actions = getDiagnosticActions(language, diagnostic, apply);

    expect(actions.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        "Replace @I9@ with @I1@",
        "Create INDI record @I9@",
      ]),
    );
    actions[0].apply();
    expect(apply).toHaveBeenCalledOnce();
  });

  it("contains platform callback failures inside lint actions", () => {
    const language = new EditorLanguageService();
    language.update(text);
    const diagnostic = language.service
      .getDiagnostics()
      .find(({ code }) => code === "unresolved-xref")!;
    const actions = getDiagnosticActions(language, diagnostic, () => {
      throw new Error("host failed");
    });

    expect(() => actions[0].apply()).not.toThrow();
  });
});

describe("the links a document holds", () => {
  const links = (source: string) =>
    getDocumentLinkSpecs(
      EditorState.create({ doc: source }),
      new EditorLanguageService(),
    );

  it("marks a web address, so a reader can see there is one", () => {
    const source =
      "0 HEAD\n1 GEDC\n2 VERS 7.0\n0 @R1@ REPO\n1 WWW https://example.org/\n0 TRLR";
    const [link] = links(source);

    expect(link?.kind).toBe("http");
    expect(source.slice(link?.from, link?.to)).toBe("https://example.org/");
  });

  it("marks a file beside the document, which is not the same kind of link", () => {
    const source =
      "0 HEAD\n1 GEDC\n2 VERS 7.0\n0 @O1@ OBJE\n1 FILE media/portrait.png\n2 FORM image/png\n0 TRLR";
    const [link] = links(source);

    expect(link?.kind).toBe("file-relative");
    expect(source.slice(link?.from, link?.to)).toBe("media/portrait.png");
  });

  it("marks nothing where a payload is empty", () => {
    expect(
      links("0 HEAD\n1 GEDC\n2 VERS 7.0\n0 @O1@ OBJE\n1 FILE\n0 TRLR"),
    ).toEqual([]);
  });
});

describe("the class a stylesheet reaches a token by", () => {
  const legend = semanticTokenLegend.tokenTypes;

  it("is the name the legend gives", () => {
    expect(tokenClass(legend.indexOf("keyword"))).toBe("gedcom-token-keyword");
    expect(tokenClass(legend.indexOf("comment"))).toBe("gedcom-token-comment");
  });

  it("is nothing for a type outside the legend", () => {
    expect(tokenClass(legend.length)).toBeNull();
  });
});

describe("the tag a link is coloured by", () => {
  it("is a url for a web address and a link for a file", () => {
    expect(documentLinkTag("http")).toBe(tags.url);
    expect(documentLinkTag("file-relative")).toBe(tags.link);
    expect(documentLinkTag("file-absolute")).toBe(tags.link);
  });
});
