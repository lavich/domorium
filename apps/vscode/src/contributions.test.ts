import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { semanticTokenLegend } from "@domorium/language-service";
import { describe, expect, it } from "vitest";

import contributed from "../package.json";
import { GEDCOM_DOCUMENTS } from "./documentSelector";

/*
 * A theme with no rule for a semantic type falls back to the TextMate scope VS
 * Code maps it to, and the default for `variable` is `variable.other.readwrite`,
 * which most themes leave the colour of ordinary text. The map names scopes to
 * fall back to instead. Its keys are semantic selectors, and a stale one is
 * ignored rather than reported — which is what this test is for.
 */
describe("the scopes a theme reaches a GEDCOM token by", () => {
  const [contribution] = contributed.contributes.semanticTokenScopes;
  const selectors = Object.keys(contribution.scopes);

  it("belongs to the language the extension contributes", () => {
    expect(contribution.language).toBe(
      contributed.contributes.languages[0]?.id,
    );
  });

  it("names types and modifiers the legend has", () => {
    for (const selector of selectors) {
      const [type, ...modifiers] = selector.split(".");
      expect(semanticTokenLegend.tokenTypes).toContain(type);
      for (const modifier of modifiers) {
        expect(semanticTokenLegend.tokenModifiers).toContain(modifier);
      }
    }
  });

  it("gives every selector somewhere to fall back to", () => {
    for (const selector of selectors) {
      expect(
        contribution.scopes[selector as keyof typeof contribution.scopes],
      ).not.toHaveLength(0);
    }
  });
});

/*
 * The grammar is the static half of the highlighting: it paints before the
 * language server connects, and it is the only thing that can paint a GEDCOM
 * code fence in Markdown, where the document's language is `markdown` and
 * semantic tokens never arrive. What that costs is a set of names that have to
 * agree across three files — the manifest, the grammar and the injection — and
 * every disagreement here is silent in the editor.
 */
describe("the grammars the extension contributes", () => {
  const extensionRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
  const grammars = contributed.contributes.grammars;
  const read = (
    path: string,
  ): { scopeName?: string; injectionSelector?: string } =>
    JSON.parse(readFileSync(join(extensionRoot, path), "utf8"));

  it.each(grammars)("finds the file $path names", ({ path }) => {
    expect(existsSync(join(extensionRoot, path))).toBe(true);
  });

  /*
   * .vscodeignore ignores everything and names what to keep, so a directory is
   * left out of the .vsix until it is named there — and an extension whose
   * grammar was not packaged highlights exactly as much as one with no grammar.
   */
  it.each(grammars)("keeps $path in the package", ({ path }) => {
    const kept = readFileSync(join(extensionRoot, ".vscodeignore"), "utf8")
      .split("\n")
      .flatMap((line) => (line.startsWith("!") ? [line.slice(1)] : []));
    expect(kept).toContain(`${path.replace(/^\.\//, "").split("/")[0]}/**`);
  });

  // A grammar whose file disagrees with the manifest is registered under the
  // scope in the file, so nothing includes it and nothing says why.
  it.each(grammars)(
    "agrees with $path about its scope",
    ({ path, scopeName }) => {
      expect(read(path).scopeName).toBe(scopeName);
    },
  );

  it("binds one grammar to the language the extension contributes", () => {
    const bound = grammars.filter((grammar) => "language" in grammar);
    expect(bound).toHaveLength(1);
    expect(bound[0].language).toBe(contributed.contributes.languages[0]?.id);
  });

  it("injects the other into Markdown, and says so in the file too", () => {
    const injected = grammars.filter((grammar) => "injectTo" in grammar);
    expect(injected).toHaveLength(1);
    const [{ path, injectTo }] = injected;
    expect(injectTo).toEqual(["text.html.markdown"]);
    // The L prefix puts the injection ahead of Markdown's own patterns, which is
    // what beats its fenced_code_block_unknown catch-all.
    expect(read(path).injectionSelector).toBe("L:text.html.markdown");
  });

  it("tells the editor a fence holds GEDCOM and not prose", () => {
    const [injected] = grammars.filter(
      (grammar) => "embeddedLanguages" in grammar,
    );
    expect(injected.embeddedLanguages).toEqual({
      "meta.embedded.block.gedcom": "source.gedcom",
    });
  });
});

// #160: undeclared, and the editor says nothing about why nothing works.
describe("what the manifest says about where the extension may run", () => {
  it("supports an untrusted workspace, because it executes nothing from one", () => {
    expect(contributed.capabilities.untrustedWorkspaces).toEqual({
      supported: true,
    });
  });

  it("supports a virtual workspace as far as it can, and says what is missing", () => {
    const virtual = contributed.capabilities.virtualWorkspaces;
    expect(virtual.supported).toBe("limited");
    expect(virtual.description).toMatch(/link/i);
  });

  it("wakes for a folder holding GEDCOM, not only for an open file", () => {
    expect(contributed.activationEvents).toContain(
      "workspaceContains:**/*.ged",
    );
  });

  it("turns semantic highlighting on for GEDCOM, whatever the theme asks", () => {
    expect(
      contributed.contributes.configurationDefaults["[gedcom]"][
        "editor.semanticHighlighting.enabled"
      ],
    ).toBe(true);
  });
});

describe("the documents the client attaches to", () => {
  it("names the language and not one scheme, so a virtual file counts", () => {
    expect(GEDCOM_DOCUMENTS).toEqual([{ language: "gedcom" }]);
  });
});

/*
 * VS Code has two notions of a word. The language configuration's wordPattern
 * decides word-based suggestions and the text a completion without a range of
 * its own replaces; editor.wordSeparators decides double-click and word
 * movement. Both split at `@` by default, which breaks an xref in two.
 */
describe("what a word is in a GEDCOM document", () => {
  const extensionRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
  const [language] = contributed.contributes.languages;
  const configuration: {
    wordPattern: string;
    comments: { lineComment?: string; blockComment?: string[] };
    [key: string]: unknown;
  } = JSON.parse(
    readFileSync(join(extensionRoot, language.configuration), "utf8"),
  );

  // VS Code's own defaults (DEFAULT_WORD_REGEXP and the default
  // editor.wordSeparators), which GEDCOM's differ from only at `@`.
  const VSCODE_WORD_PATTERN =
    /(-?\d*\.\d\w*)|([^`~!@#$%^&*()\-=+[{\]}\\|;:'",.<>/?\s]+)/g;
  const VSCODE_WORD_SEPARATORS = "`~!@#$%^&*()-=+[{]}\\|;:'\",.<>/?";

  const words = (line: string, pattern = configuration.wordPattern) =>
    [...line.matchAll(new RegExp(pattern, "g"))].map((match) => match[0]);

  // The end of a word belongs to it, as in VS Code's getWordAtPosition.
  const wordAt = (
    line: string,
    position: number,
    pattern: string | RegExp = configuration.wordPattern,
  ) =>
    [...line.matchAll(new RegExp(pattern, "g"))].find(
      (match) =>
        match.index <= position && match.index + match[0].length >= position,
    )?.[0];

  it("is read from a file the package keeps", () => {
    expect(existsSync(join(extensionRoot, language.configuration))).toBe(true);
    const kept = readFileSync(join(extensionRoot, ".vscodeignore"), "utf8")
      .split("\n")
      .flatMap((line) => (line.startsWith("!") ? [line.slice(1)] : []));
    expect(kept).toContain(language.configuration.replace(/^\.\//, ""));
  });

  it("takes an xref whole, from its first at-sign to its last", () => {
    const line = "1 HUSB @I1@";
    for (let position = 7; position <= line.length; position += 1) {
      expect(wordAt(line, position)).toBe("@I1@");
    }
    expect(wordAt("0 @F12@ FAM", 4)).toBe("@F12@");
  });

  it("is VS Code's default with the xref tried first", () => {
    expect(wordAt("1 HUSB @I1@", 9, VSCODE_WORD_PATTERN)).toBe("I1");
    expect(configuration.wordPattern).toBe(
      `(@[A-Za-z0-9_]+@)|${VSCODE_WORD_PATTERN.source}`,
    );
  });

  it("splits everything else as VS Code does", () => {
    expect(wordAt("1 _UID 1234", 4)).toBe("_UID");
    expect(words("1 NAME John /Doe/")).toEqual(["1", "NAME", "John", "Doe"]);
    expect(words("1 EMAIL john@example.com")).toEqual([
      "1",
      "EMAIL",
      "john",
      "example",
      "com",
    ]);
  });

  it("lets an at-sign join a word for selection and movement", () => {
    const separators =
      contributed.contributes.configurationDefaults["[gedcom]"][
        "editor.wordSeparators"
      ];
    expect(separators).toBe(VSCODE_WORD_SEPARATORS.replace("@", ""));
  });

  it("declares no comment syntax, as GEDCOM has none", () => {
    expect(configuration.comments).toEqual({});
  });

  // VS Code turns `brackets` into auto-closing pairs when none are given, so a
  // harmless-looking key would start inserting `@`.
  it("inserts nothing on the user's behalf", () => {
    expect(Object.keys(configuration).sort()).toEqual([
      "comments",
      "wordPattern",
    ]);
  });
});
