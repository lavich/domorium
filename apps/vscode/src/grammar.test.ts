import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { semanticTokenLegend } from "@domorium/language-service";
import { describe, expect, it } from "vitest";
import { loadWASM, OnigScanner, OnigString } from "vscode-oniguruma";
import { INITIAL, parseRawGrammar, Registry } from "vscode-textmate";

import contributed from "../package.json";

const require = createRequire(import.meta.url);
const extensionRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/*
 * Resolved through the manifest rather than by name, so a contribution pointing
 * at a file that is not there fails here instead of shipping an extension that
 * silently highlights nothing.
 */
const grammarFile = (scopeName: string): string => {
  const contribution = contributed.contributes.grammars.find(
    (grammar) => grammar.scopeName === scopeName,
  );
  if (!contribution) {
    throw new Error(`the manifest contributes no grammar for ${scopeName}`);
  }
  return join(extensionRoot, contribution.path);
};

/*
 * Stands in for what Markdown does to a fence inside a list item or a blockquote:
 * the host rule consumes the indent, so source.gedcom is included at a position
 * that is not the start of the line. A `^` anchor cannot match there — which is
 * why every pattern is anchored `(^|\G)`, as VS Code's own grammars are.
 */
const INDENTED_HOST = "text.gedcom-test.indented";
const indentedHost = {
  scopeName: INDENTED_HOST,
  patterns: [
    {
      begin: "^[ \t]+",
      end: "$",
      contentName: "meta.embedded.block.gedcom",
      patterns: [{ include: "source.gedcom" }],
    },
  ],
};

const registry = new Registry({
  onigLib: loadWASM(
    readFileSync(require.resolve("vscode-oniguruma/release/onig.wasm")),
  ).then(() => ({
    createOnigScanner: (patterns: string[]) => new OnigScanner(patterns),
    createOnigString: (text: string) => new OnigString(text),
  })),
  loadGrammar: (scopeName) => {
    if (scopeName === INDENTED_HOST) {
      return Promise.resolve(
        parseRawGrammar(JSON.stringify(indentedHost), `${INDENTED_HOST}.json`),
      );
    }
    const path = grammarFile(scopeName);
    return Promise.resolve(parseRawGrammar(readFileSync(path, "utf8"), path));
  },
});

interface Scoped {
  text: string;
  scopes: string[];
}

const tokenize = async (
  scopeName: string,
  text: string,
): Promise<Scoped[][]> => {
  const grammar = await registry.loadGrammar(scopeName);
  if (!grammar) {
    throw new Error(`${grammarFile(scopeName)} did not parse as a grammar`);
  }
  let stack = INITIAL;
  return text.split("\n").map((line) => {
    const { tokens, ruleStack } = grammar.tokenizeLine(line, stack);
    stack = ruleStack;
    return tokens.map((token) => ({
      text: line.slice(token.startIndex, token.endIndex),
      scopes: token.scopes,
    }));
  });
};

const GEDCOM_SCOPES = new Set([
  "comment.gedcom",
  "entity.name.function.gedcom",
  "keyword.gedcom",
  "entity.name.type.gedcom",
  "string.gedcom",
]);

/** What the grammar paints, in order. Whitespace between parts carries nothing. */
const painted = (tokens: Scoped[]): [string, string][] =>
  tokens.flatMap((token) => {
    const scope = token.scopes.findLast((candidate) =>
      GEDCOM_SCOPES.has(candidate),
    );
    return scope ? [[token.text, scope] as [string, string]] : [];
  });

const paintedLine = async (line: string): Promise<[string, string][]> =>
  painted((await tokenize("source.gedcom", line))[0]);

describe("what the GEDCOM grammar paints", () => {
  it("colours a tag with no payload", async () => {
    expect(await paintedLine("0 HEAD")).toEqual([
      ["0", "comment.gedcom"],
      ["HEAD", "keyword.gedcom"],
    ]);
  });

  it("colours a payload as a string", async () => {
    expect(await paintedLine("2 VERS 7.0")).toEqual([
      ["2", "comment.gedcom"],
      ["VERS", "keyword.gedcom"],
      ["7.0", "string.gedcom"],
    ]);
  });

  it("sets the record an XREF declares apart from a reference to one", async () => {
    expect(await paintedLine("0 @I1@ INDI")).toEqual([
      ["0", "comment.gedcom"],
      ["@I1@", "entity.name.function.gedcom"],
      ["INDI", "keyword.gedcom"],
    ]);
    expect(await paintedLine("1 FAMS @F1@")).toEqual([
      ["1", "comment.gedcom"],
      ["FAMS", "keyword.gedcom"],
      ["@F1@", "entity.name.type.gedcom"],
    ]);
  });

  // The lexer reads a pointer only where nothing follows it; anything else is a
  // payload, and the two layers have to say the same.
  it("reads an XREF followed by more text as a payload", async () => {
    expect(await paintedLine("1 NOTE @N1@ and more")).toEqual([
      ["1", "comment.gedcom"],
      ["NOTE", "keyword.gedcom"],
      ["@N1@ and more", "string.gedcom"],
    ]);
  });

  it("leaves a payload whole, however much it could pick out inside it", async () => {
    expect(await paintedLine("1 NAME John /Doe/")).toEqual([
      ["1", "comment.gedcom"],
      ["NAME", "keyword.gedcom"],
      ["John /Doe/", "string.gedcom"],
    ]);
    expect(await paintedLine("2 DATE 1 JAN 2000")).toEqual([
      ["2", "comment.gedcom"],
      ["DATE", "keyword.gedcom"],
      ["1 JAN 2000", "string.gedcom"],
    ]);
    expect(await paintedLine("1 NOTE @@ escaped")).toEqual([
      ["1", "comment.gedcom"],
      ["NOTE", "keyword.gedcom"],
      ["@@ escaped", "string.gedcom"],
    ]);
  });

  it("gives an extension tag and an unknown tag the tag scope", async () => {
    expect(await paintedLine("1 _MYTAG something")).toEqual([
      ["1", "comment.gedcom"],
      ["_MYTAG", "keyword.gedcom"],
      ["something", "string.gedcom"],
    ]);
    expect(await paintedLine("1 NOTAG value")).toEqual([
      ["1", "comment.gedcom"],
      ["NOTAG", "keyword.gedcom"],
      ["value", "string.gedcom"],
    ]);
  });

  // The lexer skips whitespace before a level, so a slightly indented file still
  // gets semantic tokens, and the grammar has to reach it too.
  it("reads a line indented before its level", async () => {
    expect(await paintedLine("  1 NAME x")).toEqual([
      ["1", "comment.gedcom"],
      ["NAME", "keyword.gedcom"],
      ["x", "string.gedcom"],
    ]);
  });

  /*
   * Markdown consumes the indent of a fence inside a list item or a blockquote
   * before it reaches the embedded grammar, so the line arrives already begun.
   * Anchoring on `^` alone painted nothing there while every other test passed.
   */
  it("reads a line it is handed part-way through", async () => {
    const tokens = (await tokenize(INDENTED_HOST, "  0 @I1@ INDI"))[0];
    expect(painted(tokens)).toEqual([
      ["0", "comment.gedcom"],
      ["@I1@", "entity.name.function.gedcom"],
      ["INDI", "keyword.gedcom"],
    ]);
  });
});

describe("what the GEDCOM grammar judges", () => {
  it("says nothing about a value the validator would reject", async () => {
    expect(await paintedLine("1 SEX Male")).toEqual([
      ["1", "comment.gedcom"],
      ["SEX", "keyword.gedcom"],
      ["Male", "string.gedcom"],
    ]);
  });

  // docs/adr/0010 holds a ```gedcom fence of specification notation. Left plain
  // rather than marked invalid: the validator has the only word on that.
  it("leaves what it cannot read uncoloured rather than marking it", async () => {
    const notation = "NOTE_STRUCTURE:  n NOTE @<XREF:NOTE>@  |  n NOTE";
    const tokens = (await tokenize("source.gedcom", notation))[0];
    expect(painted(tokens)).toEqual([]);
    expect(tokens.flatMap((token) => token.scopes)).not.toContain(
      expect.stringContaining("invalid"),
    );
  });

  it("carries no list of tags, values or formats", () => {
    const grammar = readFileSync(grammarFile("source.gedcom"), "utf8");
    expect(grammar).not.toMatch(/invalid\./);
    for (const known of ["INDI", "GREGORIAN", "ADOPTED", "CONFIDENTIAL"]) {
      expect(grammar).not.toContain(known);
    }
  });
});

const MARKDOWN = "markdown.gedcom.codeblock";

const fenced = async (
  markdown: string,
): Promise<{ painted: [string, string][]; embedded: string[] }> => {
  const lines = await tokenize(MARKDOWN, markdown);
  return {
    painted: lines.flatMap(painted),
    embedded: lines.flatMap((tokens) =>
      tokens
        .filter((token) => token.scopes.includes("meta.embedded.block.gedcom"))
        .map((token) => token.text),
    ),
  };
};

describe("a GEDCOM code fence in Markdown", () => {
  it("is coloured as it would be in a .ged file, and declared embedded", async () => {
    const { painted: scopes, embedded } = await fenced(
      ["Before.", "", "```gedcom", "0 @I1@ INDI", "```", "", "After."].join(
        "\n",
      ),
    );
    expect(scopes).toEqual([
      ["0", "comment.gedcom"],
      ["@I1@", "entity.name.function.gedcom"],
      ["INDI", "keyword.gedcom"],
    ]);
    expect(embedded.join("")).toBe("0 @I1@ INDI");
  });

  it("is matched without regard to case", async () => {
    const { painted: scopes } = await fenced("```GEDCOM\n1 NAME x\n```");
    expect(scopes).toEqual([
      ["1", "comment.gedcom"],
      ["NAME", "keyword.gedcom"],
      ["x", "string.gedcom"],
    ]);
  });

  it("is read from a tilde fence and from more than three backticks", async () => {
    expect((await fenced("~~~gedcom\n0 HEAD\n~~~")).painted).toHaveLength(2);
    expect((await fenced("````gedcom\n0 HEAD\n````")).painted).toHaveLength(2);
  });

  it("is read where it is indented under a list item", async () => {
    const { painted: scopes } = await fenced(
      ["- item:", "", "  ```gedcom", "  0 HEAD", "  ```", "", "after"].join(
        "\n",
      ),
    );
    expect(scopes).toEqual([
      ["0", "comment.gedcom"],
      ["HEAD", "keyword.gedcom"],
    ]);
  });

  it("is read where the info string carries more after the language", async () => {
    expect(
      (await fenced('```gedcom title="tree.ged"\n0 HEAD\n```')).painted,
    ).toHaveLength(2);
  });

  it("ends where the fence ends", async () => {
    const { painted: scopes } = await fenced(
      ["```gedcom", "0 HEAD", "```", "0 NOT GEDCOM ANY MORE"].join("\n"),
    );
    expect(scopes).toEqual([
      ["0", "comment.gedcom"],
      ["HEAD", "keyword.gedcom"],
    ]);
  });

  it("leaves a fence in another language alone", async () => {
    for (const language of ["json", "text", "ged", "gedcomx"]) {
      const { painted: scopes, embedded } = await fenced(
        `\`\`\`${language}\n0 HEAD\n\`\`\``,
      );
      expect(scopes, language).toEqual([]);
      expect(embedded, language).toEqual([]);
    }
  });
});

/*
 * The static layer and the semantic layer paint the same GEDCOM. A theme reaches
 * a semantic token through the scope its type resolves to — the first scope
 * `semanticTokenScopes` names for it, or the standard name itself where the
 * manifest says nothing and VS Code resolves it — and the grammar's scope is that
 * scope plus one `.gedcom` segment. A theme rule selects by prefix, so the two
 * land on the same colour and the same font style. A middle segment of its own
 * (`keyword.other.…`) would let a theme separate them, and the file would
 * recolour the moment the server connected. See docs/adr/0004.
 */
describe("the grammar and the semantic tokens paint alike", () => {
  const [contribution] = contributed.contributes.semanticTokenScopes;
  const fallback = (selector: string): string | undefined =>
    contribution.scopes[selector as keyof typeof contribution.scopes]?.[0];

  const parts = [
    { part: "a level", line: "1 NAME x", text: "1", semantic: "comment" },
    {
      part: "a tag",
      line: "1 NAME x",
      text: "NAME",
      semantic: "keyword",
    },
    { part: "a payload", line: "1 NAME x", text: "x", semantic: "string" },
    {
      part: "the record an XREF declares",
      line: "0 @I1@ INDI",
      text: "@I1@",
      semantic: "variable.declaration",
    },
    {
      part: "a reference to a record",
      line: "1 FAMS @F1@",
      text: "@F1@",
      semantic: "variable",
    },
  ];

  it.each(parts)(
    "paints $part through the scope $semantic resolves to",
    async ({ line, text, semantic }) => {
      const [type, ...modifiers] = semantic.split(".");
      expect(semanticTokenLegend.tokenTypes).toContain(type);
      for (const modifier of modifiers) {
        expect(semanticTokenLegend.tokenModifiers).toContain(modifier);
      }

      const scope = new Map(await paintedLine(line)).get(text);
      expect(scope).toBe(`${fallback(semantic) ?? semantic}.gedcom`);
    },
  );
});
