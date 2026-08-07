import { describe, expect, it } from "vitest";

import { buildAst, resolveValue } from "./ast";
import { ConfigurableLexer } from "./lexer";

const build = (text: string) =>
  buildAst(
    new ConfigurableLexer({ zeroBased: true }).tokenize(text).tokens,
    text,
  );

describe("buildAst", () => {
  it("groups a line's tokens into one node", () => {
    const { nodes } = build("0 @I1@ INDI\n1 NAME Ada /Lovelace/\n");

    expect(nodes).toHaveLength(1);
    expect(nodes[0].tokens.LEVEL?.value).toBe("0");
    expect(nodes[0].tokens.POINTER?.value).toBe("@I1@");
    expect(nodes[0].tokens.TAG?.value).toBe("INDI");
    expect(nodes[0].children[0].tokens.TAG?.value).toBe("NAME");
    expect(nodes[0].children[0].tokens.VALUE?.value).toBe("Ada /Lovelace/");
  });

  // The CST parser stopped at the first line it could not begin, reported
  // "Redundant input, expecting EOF" and dropped the rest of the file — so
  // one bad line in a genealogy export lost everything after it, and the
  // missing records were then reported as missing.
  it("reports a line with no level and keeps reading the rest", () => {
    const { nodes, malformed } = build(
      ["0 HEAD", "INDI stray", "0 @I1@ INDI", "0 TRLR"].join("\n"),
    );

    expect(malformed).toHaveLength(1);
    expect(malformed[0].range.start.line).toBe(1);
    expect(
      nodes.map((node) => node.tokens.TAG?.value ?? node.tokens.LEVEL?.value),
    ).toEqual(["HEAD", "INDI", "INDI", "TRLR"]);
  });

  it("indexes pointers and xrefs", () => {
    const { pointers, xrefs } = build(
      ["0 @I1@ INDI", "0 @F1@ FAM", "1 HUSB @I1@"].join("\n"),
    );

    expect([...pointers.keys()]).toEqual(["@I1@", "@F1@"]);
    expect(xrefs.get("@I1@")).toHaveLength(1);
  });

  // Continuation lines are ordinary lines, so grouping by line leaves them
  // alone — but a value that itself looks like the start of a line is the
  // case that would break a builder keyed on finding a level instead.
  it("keeps a continuation whose value looks like a GEDCOM line", () => {
    const { nodes } = build(
      ["0 @I1@ INDI", "1 NOTE first", "2 CONT 0 HEAD", "2 CONC  and more"].join(
        "\n",
      ),
    );
    const note = nodes[0].children[0];

    expect(nodes).toHaveLength(1);
    expect(note.children.map((child) => child.tokens.TAG?.value)).toEqual([
      "CONT",
      "CONC",
    ]);
    expect(note.children[0].tokens.VALUE?.value).toBe("0 HEAD");
    expect(resolveValue(note)).toBe("first\n0 HEAD and more");
  });

  it("keeps a continuation that carries no value", () => {
    const { nodes } = build(
      ["0 @I1@ INDI", "1 NOTE first", "2 CONT", "2 CONT last"].join("\n"),
    );

    expect(resolveValue(nodes[0].children[0])).toBe("first\n\nlast");
  });

  // One space delimits the tag from the value; every further space belongs to
  // the value. A NOTE holding a transcription, an address block or verse has
  // to come back out of the tree as the text the file contained.
  it("keeps the indentation of a continued note", () => {
    const { nodes } = build(
      [
        "0 @I1@ INDI",
        "1 NOTE Recipe:",
        "2 CONT     take two eggs",
        "2 CONT     and stir",
      ].join("\n"),
    );

    expect(resolveValue(nodes[0].children[0])).toBe(
      "Recipe:\n    take two eggs\n    and stir",
    );
  });

  it("widens a record to cover its whole subtree", () => {
    const text = ["0 @I1@ INDI", "1 BIRT", "2 DATE 1 JAN 1900", "0 TRLR"].join(
      "\n",
    );
    const { nodes } = build(text);

    expect(nodes[0].startOffset).toBe(0);
    expect(nodes[0].endOffset).toBe(text.indexOf("\n0 TRLR"));
  });
});
