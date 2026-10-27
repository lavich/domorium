import { createToken, Lexer } from "chevrotain";
import { describe, it, expect } from "vitest";
import { ConfigurableLexer, tokens } from "./lexer";

const gedcomLexer = new ConfigurableLexer({ zeroBased: true });

describe("positive tests", () => {
  it("parse level and tag", () => {
    const { tokens, errors } = gedcomLexer.tokenize("1 BIRT");
    expect(errors.length).toBe(0);
    expect(tokens.length).toBe(2);
    expect(tokens[0].startColumn).toBe(0);
    expect(tokens[0].endColumn).toBe(0);
    expect(tokens[1].startColumn).toBe(2);
    expect(tokens[1].endColumn).toBe(5);
  });

  it("parse level, tag, value", () => {
    const { tokens, errors } = gedcomLexer.tokenize("1 BIRT VALU E");
    expect(errors.length).toBe(0);
    expect(tokens.length).toBe(3);
  });

  it("parse new line with level, tag, value", () => {
    const { tokens, errors } = gedcomLexer.tokenize(
      "1 NAME John /Doe/\n1 NAME John /Doe/",
    );
    expect(errors.length).toBe(0);
    expect(tokens.length).toBe(6);
  });

  it("parse level, pointer, tag", () => {
    const { tokens, errors } = gedcomLexer.tokenize(
      "1 @POINTER@ BIRT \n1 @POINTER@ BIRT",
    );
    expect(errors.length).toBe(0);
    expect(tokens.length).toBe(6);
  });

  it("parse level, pointer, tag, value with multiple words", () => {
    const { tokens, errors } = gedcomLexer.tokenize("1 @POINTER@ BIRT er df");
    expect(errors.length).toBe(0);
    expect(tokens.length).toBe(4);
    expect(tokens[3].image).toBe("er df");
  });

  it("parse new level", () => {
    const { tokens, errors } = gedcomLexer.tokenize("1 BIRT VALU E\n2 TEST e");
    expect(errors.length).toBe(0);
    expect(tokens.length).toBe(6);
  });

  it("parse level, pointer, tag, value (e.g. GEDCOM 7 SNOTE record)", () => {
    const { tokens, errors } = gedcomLexer.tokenize("0 @N1@ SNOTE Shared note");
    expect(errors.length).toBe(0);
    expect(tokens.length).toBe(4);
    expect(tokens[3].image).toBe("Shared note");
  });

  it("keeps every space past the one that delimits the value", () => {
    const { tokens, errors } = gedcomLexer.tokenize("1 NOTE     indented");
    expect(errors.length).toBe(0);
    expect(tokens[2].image).toBe("    indented");
  });

  it("reads a value that is only spaces", () => {
    const { tokens, errors } = gedcomLexer.tokenize("2 CONT  ");
    expect(errors.length).toBe(0);
    expect(tokens[2].image).toBe(" ");
  });

  it("gives a tag no value when only the delimiter follows", () => {
    const { tokens, errors } = gedcomLexer.tokenize("2 CONT ");
    expect(errors.length).toBe(0);
    expect(tokens.length).toBe(2);
  });

  it("still reads an xref rather than a value", () => {
    const { tokens, errors } = gedcomLexer.tokenize("1 HUSB @I1@");
    expect(errors.length).toBe(0);
    expect(tokens[2].tokenType.name).toBe("XREF");
  });

  // Issue #95: the specification permits a byte order mark, and 19 of the 22
  // official test files carry one. The character is invisible in a diff, so it
  // is written as an escape here on purpose.
  describe("byte order mark", () => {
    const BOM = "\uFEFF";

    it("skips one at the start of the document", () => {
      const { tokens, errors } = gedcomLexer.tokenize(`${BOM}0 HEAD`);
      expect(errors).toEqual([]);
      expect(tokens.length).toBe(2);
    });

    it("leaves every offset where it was", () => {
      const source = "0 HEAD\n1 GEDC\n2 VERS 7.0";
      const plain = gedcomLexer.tokenize(source);
      const marked = gedcomLexer.tokenize(BOM + source);

      // The one thing that would break if the mark were stripped from the text
      // instead: each range would slide by a character, and diagnostics are
      // placed by offset.
      expect(marked.errors).toEqual([]);
      expect(marked.tokens.map((t) => t.startOffset)).toEqual(
        plain.tokens.map((t) => t.startOffset + 1),
      );
      // Only the first line is pushed along by it; columns restart after a
      // newline, so every later line reads exactly as it did.
      expect(marked.tokens.map((t) => [t.startLine, t.startColumn])).toEqual(
        plain.tokens.map((t) => [
          t.startLine,
          t.startLine === 0 ? t.startColumn! + 1 : t.startColumn,
        ]),
      );
    });

    it("still reports one at the start of a later line", () => {
      const { errors } = gedcomLexer.tokenize(`0 HEAD\n${BOM}0 TRLR`);
      expect(errors.length).toBe(1);
      expect(errors[0].line).toBe(1);
    });

    it("keeps one inside a payload, where it is an ordinary character", () => {
      const { tokens, errors } = gedcomLexer.tokenize(`1 NAME A${BOM}B`);
      expect(errors).toEqual([]);
      expect(tokens[2].image).toBe(`A${BOM}B`);
    });
  });

  it("parse SAMPLE", () => {
    const SAMPLE = `0 @I1@ INDI
1 NAME John /Doe/
1 BIRT
1 BIRT
2 DATE 1 JAN 1900
0 @I2@ INDI
3 FAM @i2@
1 NAME Jane /Doe/`;
    const { tokens, errors } = gedcomLexer.tokenize(SAMPLE);
    expect(errors.length).toBe(0);
    expect(tokens.length).toBe(22);
  });
});

// #252: matched as far as `N`, and the rest became a value.
describe("a tag written in mixed case", () => {
  it("is read as the file wrote it", () => {
    const { tokens, errors } = gedcomLexer.tokenize("1 NoTe hello");

    expect(errors).toEqual([]);
    expect(tokens.map((token) => [token.tokenType.name, token.image])).toEqual([
      ["LEVEL", "1"],
      ["TAG", "NoTe"],
      ["VALUE", "hello"],
    ]);
  });

  it("does not turn a line without a level into one", () => {
    const { tokens } = gedcomLexer.tokenize("hello world");

    expect(tokens.every((token) => token.tokenType.name !== "Level")).toBe(
      true,
    );
  });
});

// Every line shape the mode table distinguishes, malformed ones included.
const LINE_SHAPES = [
  "﻿0 HEAD",
  "1",
  "1 BIRT",
  "1 NAME John /Doe/",
  "1 HUSB @I1@",
  "1 HUSB @I1@ trailing text",
  "1 TAG-x",
  "1 BIRT ",
  "1 NOTE\t\ttab",
  "0 @I1@",
  "0 @I1@ INDI",
  "0 @I2@ INDI ",
  "0 @N1@ SNOTE some text",
  "0 @S1@ SNOTE @VOID@ 1990 note",
  "0 @F1@ FAM @I1@ @I2@",
  "",
  "1 @BAD",
  " x 1 2",
  "@I9@ X",
  "9",
];
const TERMINATORS = ["\n", "\r\n", "\r", "\n\r"];

function document(lines: string[], terminator = "\n"): string {
  return lines.join(terminator);
}

describe("the mode stack", () => {
  type HandleModes = (
    config: { pop?: boolean; push?: string },
    pop: (token: unknown) => void,
    push: (mode: string) => void,
    token: unknown,
  ) => void;

  function deepest(text: string): { calls: number; depth: number } {
    const prototype = Lexer.prototype as unknown as {
      handleModes: HandleModes;
    };
    const original = prototype.handleModes;
    let calls = 0;
    // The initial mode is pushed without passing through handleModes.
    let depth = 1;
    let max = 1;
    prototype.handleModes = function (config, pop, push, token) {
      calls += 1;
      // A pop that leaves nothing is ignored, unless a push makes it a transition.
      if (config.pop && (depth > 1 || config.push !== undefined)) {
        depth -= 1;
      }
      if (config.push !== undefined) {
        depth += 1;
      }
      max = Math.max(max, depth);
      original.call(this, config, pop, push, token);
    };
    try {
      gedcomLexer.tokenize(text);
    } finally {
      prototype.handleModes = original;
    }
    return { calls, depth: max };
  }

  it.each(
    TERMINATORS.map((terminator) => [JSON.stringify(terminator), terminator]),
  )(
    "stays two deep over every line shape, lines ended by %s",
    (_name, terminator) => {
      const lines = Array.from({ length: 50 }, () => LINE_SHAPES).flat();
      const { calls, depth } = deepest(document(lines, terminator));

      expect(calls).toBeGreaterThan(0);
      expect(depth).toBe(2);
    },
  );
});

/*
 * The unbounded mode table, the reference the bounded one must lex every input
 * to the same tokens as. It catches a transition that returns a line to the
 * wrong mode. It shares the token definitions, so it compares mode tables only.
 */
const before = (() => {
  const Newline = createToken({
    name: "Newline",
    pattern: /\r\n|\n\r|\r|\n/,
    group: Lexer.SKIPPED,
    line_breaks: true,
    push_mode: "main",
  });
  const WhiteSpace = createToken({
    name: "WhiteSpace",
    pattern: /[ \t]+/,
    group: Lexer.SKIPPED,
  });
  const Delimiter = createToken({
    name: "Delimiter",
    pattern: /[ \t]/,
    group: Lexer.SKIPPED,
    pop_mode: true,
    push_mode: "afterDelimiter",
  });
  const ByteOrderMark = createToken({
    name: "ByteOrderMark",
    pattern: (text: string, startOffset: number) =>
      startOffset === 0 && text.charCodeAt(0) === 0xfeff ? ["﻿"] : null,
    start_chars_hint: ["﻿"],
    line_breaks: false,
    group: Lexer.SKIPPED,
  });
  return new Lexer(
    {
      defaultMode: "main",
      modes: {
        main: [
          ByteOrderMark,
          Newline,
          WhiteSpace,
          tokens.Level,
          tokens.Pointer,
          { ...tokens.Tag, PUSH_MODE: "hasNotPointer" },
        ],
        hasPointer: [
          Newline,
          WhiteSpace,
          { ...tokens.Tag, PUSH_MODE: "hasNotPointer" },
        ],
        hasNotPointer: [Newline, Delimiter, tokens.Xref, tokens.Value],
        afterDelimiter: [Newline, tokens.Xref, tokens.Value],
      },
    },
    { positionTracking: "full" },
  );
})();

describe("the bounded mode table", () => {
  const lexer = new ConfigurableLexer({ positionTracking: "full" });
  const shape = (text: string) => {
    const { tokens: lexed, errors } = lexer.tokenize(text);
    const reference = before.tokenize(text);
    return {
      actual: {
        tokens: lexed.map((t) => [
          t.tokenType.name,
          t.image,
          t.startOffset,
          t.startLine,
          t.startColumn,
        ]),
        errors: errors.map((e) => [
          e.offset,
          e.line,
          e.column,
          e.length,
          e.message,
        ]),
      },
      expected: {
        tokens: reference.tokens.map((t) => [
          t.tokenType.name,
          t.image,
          t.startOffset,
          t.startLine,
          t.startColumn,
        ]),
        errors: reference.errors.map((e) => [
          e.offset,
          e.line,
          e.column,
          e.length,
          e.message,
        ]),
      },
    };
  };

  it.each(LINE_SHAPES)("lexes %j as before, after any line", (line) => {
    for (const previous of LINE_SHAPES) {
      for (const terminator of TERMINATORS) {
        const { actual, expected } = shape(
          document([previous, line, "1 NEXT line"], terminator),
        );
        expect(actual).toEqual(expected);
      }
    }
  });

  it("lexes generated documents as before", () => {
    const pieces = [
      "0",
      "12",
      " ",
      "  ",
      "\t",
      "@I1@",
      "@X",
      "@",
      "TAG",
      "_UID",
      "Tag-x",
      "text",
      "é",
      "/Doe/",
      "\n",
      "\r\n",
      "\r",
      "\n\r",
    ];
    let seed = 80;
    const next = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed;
    };
    for (let run = 0; run < 3000; run += 1) {
      const length = 1 + (next() % 24);
      const text = Array.from(
        { length },
        () => pieces[next() % pieces.length],
      ).join("");
      const { actual, expected } = shape(text);
      expect(actual, JSON.stringify(text)).toEqual(expected);
    }
  });
});
