import { describe, expect, it } from "vitest";
import { TokenNames, type ASTNode, type ASTToken } from "@domorium/validator";
import { GedcomLanguageService } from "../../languageService";
import { ReferenceIndex } from "./referenceIndex";

/** A level-0 record declaration, one per line, whose range reports on access. */
function declarationNode(line: number, onRead: () => void): ASTNode {
  const at = (character: number, length: number) => ({
    start: { line, character },
    end: { line, character: character + length },
  });
  const tag: ASTToken = {
    name: TokenNames.TAG,
    value: "INDI",
    startOffset: 7,
    endOffset: 11,
    range: at(7, 4),
  };
  const pointer: ASTToken = {
    name: TokenNames.POINTER,
    value: `@I${line}@`,
    startOffset: 2,
    endOffset: 2 + `@I${line}@`.length,
    get range() {
      onRead();
      return at(2, `@I${line}@`.length);
    },
  };
  return {
    level: 0,
    startOffset: 0,
    endOffset: 11,
    range: at(0, 11),
    tokens: { [TokenNames.TAG]: tag, [TokenNames.POINTER]: pointer },
    children: [],
  };
}

describe("ReferenceIndex", () => {
  it("indexes declarations and usages without matching XREF-shaped note text", () => {
    const service = new GedcomLanguageService(
      [
        "0 HEAD",
        "1 GEDC",
        "2 VERS 7.0",
        "0 @I1@ INDI",
        "1 NOTE literal @I2@ text",
        "0 @F1@ FAM",
        "1 HUSB @I1@",
        "1 WIFE @I2@",
        "0 TRLR",
      ].join("\n"),
    );

    // `range` is derived from the indexed token rather than stored, so the
    // occurrence is checked field by field instead of by deep equality.
    const entry = service.getReferenceIndex().get("@I1@");

    expect(entry?.id).toBe("@I1@");
    expect(entry?.declarations).toHaveLength(1);
    expect(entry?.declarations[0]).toMatchObject({
      id: "@I1@",
      role: "declaration",
      recordTag: "INDI",
      fieldTag: "INDI",
    });
    expect(entry?.declarations[0].range).toEqual({
      start: { line: 3, character: 2 },
      end: { line: 3, character: 6 },
    });
    expect(entry?.usages).toHaveLength(1);
    expect(entry?.usages[0]).toMatchObject({
      id: "@I1@",
      role: "usage",
      recordTag: "FAM",
      fieldTag: "HUSB",
    });
    expect(entry?.usages[0].range).toEqual({
      start: { line: 6, character: 7 },
      end: { line: 6, character: 11 },
    });
    expect(service.getReferenceIndex().get("@I2@")?.usages).toHaveLength(1);
  });

  it("retains duplicate declarations as separate occurrences", () => {
    const service = new GedcomLanguageService(
      ["0 @I1@ INDI", "0 @I1@ INDI"].join("\n"),
    );

    expect(service.getReferenceIndex().get("@I1@")?.declarations).toHaveLength(
      2,
    );
  });

  it("does not index an XREF-shaped value in a non-pointer field", () => {
    const service = new GedcomLanguageService(
      ["0 @I1@ INDI", "1 NOTE @I1@ is prose"].join("\n"),
    );

    expect(service.getReferenceIndex().get("@I1@")?.usages).toEqual([]);
    expect(
      service.getReferences(
        { line: 1, character: 9 },
        { includeDeclaration: true },
      ),
    ).toEqual([]);
  });

  it("does not index a declaration nested below level zero", () => {
    const service = new GedcomLanguageService(
      ["0 @F1@ FAM", "1 @I1@ INDI", "1 HUSB @I1@"].join("\n"),
    );

    expect(service.getReferenceIndex().get("@I1@")?.declarations).toEqual([]);
    expect(service.prepareRename({ line: 1, character: 4 })).toMatchObject({
      ok: false,
      code: "not-xref",
    });
  });

  // A binary search replaces the linear scan in `at`, so it has to agree with
  // isPositionInRange on every edge: start inclusive, end exclusive.
  it("resolves the cursor on the first and last character of an xref, but not one past it", () => {
    // 0 @I1@ INDI  — the pointer occupies characters 2 through 5.
    const service = new GedcomLanguageService(
      ["0 @I1@ INDI", "0 @F1@ FAM", "1 HUSB @I1@"].join("\n"),
    );
    const index = service.getReferenceIndex();

    expect(index.at({ line: 0, character: 1 })).toBeUndefined();
    expect(index.at({ line: 0, character: 2 })?.role).toBe("declaration");
    expect(index.at({ line: 0, character: 5 })?.role).toBe("declaration");
    expect(index.at({ line: 0, character: 6 })).toBeUndefined();
    expect(index.at({ line: 2, character: 7 })?.role).toBe("usage");
    expect(index.at({ line: 2, character: 11 })).toBeUndefined();
  });

  it("resolves the cursor in a document with CRLF line endings", () => {
    const service = new GedcomLanguageService(
      ["0 @I1@ INDI", "0 @F1@ FAM", "1 HUSB @I1@"].join("\r\n"),
    );
    const index = service.getReferenceIndex();

    expect(index.at({ line: 2, character: 7 })).toMatchObject({
      id: "@I1@",
      role: "usage",
      range: {
        start: { line: 2, character: 7 },
        end: { line: 2, character: 11 },
      },
    });
  });

  // The binary search is only correct while occurrences are in document order.
  // They are appended by a pre-order walk today; this pins that down.
  it("appends occurrences in document order", () => {
    const service = new GedcomLanguageService(
      ["0 @I1@ INDI", "0 @F1@ FAM", "1 HUSB @I1@", "1 WIFE @I2@"].join("\n"),
    );
    const index = service.getReferenceIndex();

    const positions = [
      { line: 0, character: 2 },
      { line: 1, character: 2 },
      { line: 2, character: 7 },
      { line: 3, character: 7 },
    ];
    for (const position of positions) {
      expect(index.at(position)?.range.start).toEqual(position);
    }
  });

  // Cursor movement asks this question on every keystroke and every click, and
  // the index is rebuilt on every change. Counting how many times a range is
  // derived covers both halves: a scan touches every occurrence, and an index
  // that materialized its ranges would touch every one at build time. A wall
  // clock cannot separate the two honestly — a slow runner's good number
  // exceeds a fast machine's bad one.
  it("neither materializes every range nor scans them to find the cursor", () => {
    let reads = 0;
    const declarations = Array.from({ length: 2000 }, (_, line) =>
      declarationNode(line, () => (reads += 1)),
    );

    const index = new ReferenceIndex(declarations);

    expect(index.at({ line: 1999, character: 3 })?.id).toBe("@I1999@");
    // Twelve today: log2(2000) probes plus the containment test.
    expect(reads).toBeLessThan(40);
  });

  it("does not index HEAD or TRLR as XREF record declarations", () => {
    const service = new GedcomLanguageService(
      ["0 @H1@ HEAD", "1 GEDC", "2 VERS 7.0", "0 @T1@ TRLR"].join("\n"),
      1,
    );

    expect(service.prepareRename({ line: 0, character: 4 }, 1)).toMatchObject({
      ok: false,
      code: "not-xref",
    });
    expect(service.prepareRename({ line: 3, character: 4 }, 1)).toMatchObject({
      ok: false,
      code: "not-xref",
    });
  });
});
