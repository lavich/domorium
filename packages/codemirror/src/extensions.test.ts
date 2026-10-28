import { CompletionContext } from "@codemirror/autocomplete";
import { semanticTokenLegend } from "@domorium/language-service";
import { EditorState, type TransactionSpec } from "@codemirror/state";
import { keymap, type EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { describe, expect, it, vi } from "vitest";

import * as extensionsModule from "./extensions";
import {
  completionSource,
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

    expect(actions.map(({ name }) => name)).toEqual([
      "Create INDI record @I9@",
      "Replace with @I1@",
      "Point at nothing (@VOID@)",
    ]);
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

describe("completion", () => {
  const g7 = (line: string) =>
    [
      "0 HEAD",
      "1 GEDC",
      "2 VERS 7.0",
      "0 @I1@ INDI",
      "0 @I2@ INDI",
      "0 @F1@ FAM",
      line,
      "0 TRLR",
    ].join("\n");
  const g551 = (line: string) =>
    [
      "0 HEAD",
      "1 GEDC",
      "2 VERS 5.5.1",
      "3 FORM LINEAGE-LINKED",
      "0 @I1@ INDI",
      "1 BIRT",
      line,
      "0 TRLR",
    ].join("\n");

  /** Opens the list with the cursor at `|` in `line`, as Ctrl-Space would. */
  function open(line: string, document = g7) {
    const doc = document(line.replace("|", ""));
    const pos = document(line).indexOf("|");
    let state = EditorState.create({ doc, selection: { anchor: pos } });
    const result = completionSource(
      new EditorLanguageService(),
      new CompletionContext(state, pos, true),
    );
    if (!result) {
      throw new Error("no completions");
    }
    const view = {
      get state() {
        return state;
      },
      dispatch(spec: TransactionSpec) {
        state = state.update(spec).state;
      },
    } as unknown as EditorView;
    const accept = (label: string): string => {
      const option = result.options.find((item) => item.label === label);
      if (typeof option?.apply !== "function") {
        throw new Error(`no apply for ${label}`);
      }
      option.apply(view, option, result.from, result.to ?? pos);
      return state.doc.line(7).text;
    };
    return { result, typed: doc.slice(result.from, result.to ?? pos), accept };
  }

  it("writes @I1@ over an at-sign already typed, not @@I1@", () => {
    expect(open("1 HUSB @I|").accept("@I1@")).toBe("1 HUSB @I1@");
  });

  it("writes @I2@ over the whole xref around the cursor, not @I2@1@", () => {
    expect(open("1 HUSB @I|1@").accept("@I2@")).toBe("1 HUSB @I2@");
  });

  it("writes @#DJULIAN@ over a typed @#DJU, not @#@#DJULIAN@", () => {
    expect(open("2 DATE @#DJU|", g551).accept("@#DJULIAN@")).toBe(
      "2 DATE @#DJULIAN@",
    );
  });

  it("writes @#DJULIAN@ over the whole escape around the cursor, not @#DJULIAN@ R@", () => {
    expect(
      open("2 DATE @#DFRE|NCH R@ 1 VEND 3", g551).accept("@#DJULIAN@"),
    ).toBe("2 DATE @#DJULIAN@ 1 VEND 3");
  });

  it("matches against what was typed, not the text after the cursor", () => {
    const { result, typed } = open("1 HUSB @I|1@");

    expect(typed).toBe("@I");
    expect(result.options.map((option) => option.label)).toEqual(
      expect.arrayContaining(["@I1@", "@I2@"]),
    );
    expect(result.validFor).toBeUndefined();
  });
});
