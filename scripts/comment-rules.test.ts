import { describe, expect, it } from "vitest";

import {
  addedLines,
  commentBlocks,
  contentWords,
  declaredName,
  findings,
  identifierTokens,
  // @ts-expect-error — a .mjs script module, deliberately outside the
  // typechecked source tree.
} from "./comment-rules.mjs";

interface Block {
  start: number;
  end: number;
  text: string;
}

interface Finding {
  line: number;
  end: number;
  rule: string;
  message: string;
}

const source = (...lines: string[]) => lines.join("\n");

describe("commentBlocks", () => {
  it("reads consecutive lines as one block and the next run as another", () => {
    const blocks: Block[] = commentBlocks(
      source("// one", "// two", "const a = 1;", "// three"),
    );
    expect(blocks.map((block) => [block.start, block.end])).toEqual([
      [1, 2],
      [4, 4],
    ]);
  });

  it("reads a docblock as one block, closing line included", () => {
    const blocks: Block[] = commentBlocks(
      source("/**", " * why", " */", "export const a = 1;"),
    );
    expect(blocks).toHaveLength(1);
    expect([blocks[0].start, blocks[0].end]).toEqual([1, 3]);
  });

  it("keeps a block comment open across a line that starts with prose", () => {
    const blocks: Block[] = commentBlocks(
      source("/* why", "still the comment", "*/", "const a = 1;"),
    );
    expect(blocks.map((block) => [block.start, block.end])).toEqual([[1, 3]]);
  });

  it("does not read a // inside a string literal as a comment", () => {
    expect(commentBlocks(source('const uri = "http://example.com";'))).toEqual(
      [],
    );
  });
});

describe("identifierTokens", () => {
  it("splits camelCase, an acronym and an underscore name", () => {
    expect(identifierTokens("readDate")).toEqual(["read", "date"]);
    expect(identifierTokens("isGedcom7Payload")).toEqual([
      "is",
      "gedcom",
      "payload",
    ]);
    expect(identifierTokens("TAG_DEF_REGEXP")).toEqual([
      "tag",
      "def",
      "regexp",
    ]);
    expect(identifierTokens("WebEditorStatus")).toEqual([
      "web",
      "editor",
      "status",
    ]);
  });
});

describe("declaredName", () => {
  it("names what the line declares", () => {
    expect(declaredName("export function readDate(tokens: string[]) {")).toBe(
      "readDate",
    );
    expect(declaredName("interface SchemaChoice {")).toBe("SchemaChoice");
    expect(declaredName("const modifierKey =")).toBe("modifierKey");
    expect(declaredName("  private mayOmitPayload(tag: GedcomType) {")).toBe(
      "mayOmitPayload",
    );
  });

  it("names nothing for a line that declares nothing", () => {
    expect(declaredName("if (isExtensionTag(tag)) {")).toBeNull();
    expect(declaredName('it("keeps the indentation", () => {')).toBeNull();
    expect(declaredName("this.errors.push(...errors);")).toBeNull();
  });

  it("names nothing for a destructuring, which declares no single name", () => {
    expect(declaredName("const { scheme } = NEWEST_SUPPORTED;")).toBeNull();
  });
});

describe("contentWords", () => {
  it("drops the markers, the function words and the short ones", () => {
    expect(contentWords("/** What the status bar reports. */")).toEqual([
      "status",
      "bar",
      "reports",
    ]);
  });

  it("drops a number, which is not a word to match against a name", () => {
    expect(contentWords("// 48px of padding")).toEqual(["padding"]);
  });
});

describe("findings, a comment against the name below it", () => {
  it("reports a docblock that says what the name says", () => {
    const found: Finding[] = findings(
      source(
        "/** Reads a date, and returns the date it read. */",
        "function readDate() {}",
      ),
    );
    expect(found.map((finding) => finding.rule)).toEqual(["restates-name"]);
    expect(found[0].message).toContain("readDate");
  });

  it("leaves a comment that states a rule the name cannot", () => {
    expect(
      findings(
        source(
          "/** 5.5.1 ends a line with CR, LF, CR-LF or LF-CR. See #251. */",
          "export function createLineIndex(text: string) {}",
        ),
      ),
    ).toEqual([]);
  });

  it("leaves a comment above a statement, which declares no name to restate", () => {
    expect(
      findings(source("// Extension tags are legal here.", "return tags;")),
    ).toEqual([]);
  });

  it("leaves a comment too short to judge either way", () => {
    expect(
      findings(source("/** Reads a date. */", "function readDate() {}")),
    ).toEqual([]);
  });
});

describe("findings, a comment against its own length", () => {
  it("reports a block past four lines", () => {
    const found: Finding[] = findings(
      source(
        "// one",
        "// two",
        "// three",
        "// four",
        "// five",
        "const a = 1;",
      ),
    );
    expect(found.map((finding) => finding.rule)).toEqual(["long-comment"]);
    expect(found[0].message).toContain("5 lines");
  });

  it("leaves a block of four", () => {
    expect(
      findings(
        source("// one", "// two", "// three", "// four", "const a = 1;"),
      ),
    ).toEqual([]);
  });

  it("takes the threshold from the caller, since it is a threshold not a rule", () => {
    const long = source("// one", "// two", "// three", "const a = 1;");
    expect(findings(long, { maxLines: 2 })).toHaveLength(1);
    expect(findings(long, { maxLines: 8 })).toEqual([]);
  });
});

describe("addedLines", () => {
  const diff = source(
    "diff --git a/src/a.ts b/src/a.ts",
    "--- a/src/a.ts",
    "+++ b/src/a.ts",
    "@@ -10,0 +11,3 @@",
    "+// one",
    "+// two",
    "+// three",
    "@@ -30 +33 @@",
    "-old",
    "+new",
  );

  it("reads the new-side line numbers of every hunk", () => {
    expect([...addedLines(diff).get("src/a.ts")]).toEqual([11, 12, 13, 33]);
  });

  it("reads a hunk header with no count as one line", () => {
    const single = source("+++ b/src/a.ts", "@@ -3 +4 @@", "+const a = 1;");
    expect([...addedLines(single).get("src/a.ts")]).toEqual([4]);
  });

  it("skips a deleted file, which has no new side to report on", () => {
    expect(addedLines(source("+++ /dev/null", "@@ -1,4 +0,0 @@")).size).toBe(0);
  });

  it("skips a file whose comments this cannot read", () => {
    expect(addedLines(source("+++ b/README.md", "@@ -1 +1,2 @@")).size).toBe(0);
  });
});
