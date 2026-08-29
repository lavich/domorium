import { describe, expect, it } from "vitest";

// The first test the `scripts/` directory carries. It covers the parts of the
// conformance check that are worth testing on their own — normalising
// diagnostics, the digest, comparing an expectation, and refusing an unpinned
// location — while fetching and reporting stay in the script around them.
import {
  compare,
  contentOf,
  digestOf,
  expectationOf,
  isPinned,
  normalise,
  recordOf,
  shapeOf,
  summaryOf,
  // @ts-expect-error — a .mjs script module, deliberately outside the
  // typechecked source tree.
} from "./conformance-record.mjs";

interface Diagnostic {
  line: number;
  column: number;
  level: string;
  code: string;
}

/** The shape `GedcomDocument.getErrors()` returns, reduced to what is read. */
function error(line: number, column: number, level: string, code: string) {
  return {
    range: { start: { line: line - 1, character: column - 1 } },
    level,
    code,
    message: "whatever the wording happens to be today",
  };
}

function diagnostic(
  line: number,
  column: number,
  level: string,
  code: string,
): Diagnostic {
  return { line, column, level, code };
}

describe("contentOf", () => {
  it("hashes the bytes as they arrived", () => {
    expect(contentOf(new Uint8Array([0x61, 0x62, 0x63])).sha256).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("keeps a leading BOM, which the fetch response would strip — #95", () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, 0x30, 0x20, 0x48]);
    expect(contentOf(bytes).text).toBe("\ufeff0 H");
  });
});

describe("normalise", () => {
  it("makes positions one-based and drops the message", () => {
    expect(normalise([error(4, 7, "error", "VAL001")])).toEqual([
      { line: 4, column: 7, level: "error", code: "VAL001" },
    ]);
  });

  it("sorts by position, then level and code", () => {
    const sorted = normalise([
      error(9, 1, "warning", "VAL004"),
      error(2, 5, "error", "VAL002"),
      error(2, 1, "error", "VAL003"),
    ]);
    expect(
      sorted.map((d: Diagnostic) => `${d.line}:${d.column} ${d.code}`),
    ).toEqual(["2:1 VAL003", "2:5 VAL002", "9:1 VAL004"]);
  });
});

describe("expectationOf", () => {
  it("records line, level and code, ordered as the official records are", () => {
    expect(
      expectationOf([
        diagnostic(2, 9, "error", "VAL002"),
        diagnostic(2, 1, "warning", "VAL001"),
      ]),
    ).toEqual(["2 error VAL002", "2 warning VAL001"]);
  });
});

describe("summaryOf", () => {
  it("counts per code, sorted, with a total and a digest", () => {
    const summary = summaryOf([
      diagnostic(1, 1, "error", "VAL004"),
      diagnostic(2, 1, "error", "VAL001"),
      diagnostic(3, 1, "error", "VAL001"),
    ]);
    expect(summary.total).toBe(3);
    expect(Object.keys(summary.byCode)).toEqual(["VAL001", "VAL004"]);
    expect(summary.byCode).toEqual({ VAL001: 2, VAL004: 1 });
    expect(summary.digest).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("digestOf", () => {
  it("changes when a diagnostic moves", () => {
    const here = [diagnostic(10, 1, "error", "VAL001")];
    const there = [diagnostic(11, 1, "error", "VAL001")];
    expect(digestOf(here)).not.toBe(digestOf(there));
  });

  it("changes when only the column moves", () => {
    expect(digestOf([diagnostic(10, 1, "error", "VAL001")])).not.toBe(
      digestOf([diagnostic(10, 4, "error", "VAL001")]),
    );
  });
});

describe("shapeOf and recordOf", () => {
  it("reads the shape off the entry rather than off a count", () => {
    expect(shapeOf({ expected: [] })).toBe("expected");
    expect(shapeOf({ summary: { total: 0, byCode: {}, digest: "" } })).toBe(
      "summary",
    );
  });

  it("renews an entry in the shape it already carries", () => {
    const diagnostics = [diagnostic(1, 1, "error", "VAL001")];
    expect(recordOf("expected", diagnostics)).toEqual({
      expected: ["1 error VAL001"],
    });
    expect(Object.keys(recordOf("summary", diagnostics))).toEqual(["summary"]);
  });
});

describe("compare, per-diagnostic shape", () => {
  const recorded = { expected: ["3 error VAL001"] };

  it("passes when the diagnostics are as recorded", () => {
    expect(compare(recorded, [diagnostic(3, 1, "error", "VAL001")])).toEqual(
      [],
    );
  });

  it("reports a diagnostic that is new", () => {
    const failures = compare(recorded, [
      diagnostic(3, 1, "error", "VAL001"),
      diagnostic(8, 1, "error", "VAL004"),
    ]);
    expect(failures).toEqual(["new diagnostic at 8 error VAL004"]);
  });

  it("reports a diagnostic that stopped being reported", () => {
    const failures = compare(recorded, []);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain("no longer reported at 3 error VAL001");
  });

  it("passes when only the message would have changed", () => {
    // The message never enters the record, so a reworded diagnostic at the same
    // place is indistinguishable from the recorded one.
    expect(
      compare(recorded, normalise([error(3, 1, "error", "VAL001")])),
    ).toEqual([]);
  });
});

describe("compare, summary shape", () => {
  const diagnostics = [
    diagnostic(10, 1, "error", "VAL001"),
    diagnostic(20, 1, "error", "VAL001"),
    diagnostic(30, 1, "warning", "VAL004"),
  ];
  const recorded = { summary: summaryOf(diagnostics) };

  it("passes when the counts and the digest are as recorded", () => {
    expect(compare(recorded, diagnostics)).toEqual([]);
  });

  it("names the code and both counts when a count changes", () => {
    const fewer = diagnostics.slice(1);
    expect(compare(recorded, fewer)).toContain("VAL001 2 → 1");
  });

  it("names a code that appeared, counting from zero", () => {
    const more = [...diagnostics, diagnostic(40, 1, "error", "VAL010")];
    expect(compare(recorded, more)).toContain("VAL010 0 → 1");
  });

  it("fails when the same counts fall elsewhere in the file", () => {
    const moved = [
      diagnostic(10, 1, "error", "VAL001"),
      diagnostic(21, 1, "error", "VAL001"),
      diagnostic(30, 1, "warning", "VAL004"),
    ];
    const failures = compare(recorded, moved);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain("the same counts fall elsewhere");
  });

  it("passes when only the message would have changed", () => {
    const same = normalise([
      error(10, 1, "error", "VAL001"),
      error(20, 1, "error", "VAL001"),
      error(30, 1, "warning", "VAL004"),
    ]);
    expect(compare(recorded, same)).toEqual([]);
  });
});

describe("isPinned", () => {
  const revision = "0cefb2b064af77e243aec0515a122d4c8bb1962f";

  it("accepts a location carrying a full revision", () => {
    expect(
      isPinned(
        `https://raw.githubusercontent.com/cacack/gedcom-go/${revision}/testdata/edge-cases/xref-case.ged`,
      ),
    ).toBe(true);
  });

  it("refuses a branch", () => {
    expect(
      isPinned(
        "https://raw.githubusercontent.com/cacack/gedcom-go/main/testdata/edge-cases/xref-case.ged",
      ),
    ).toBe(false);
  });

  it("refuses an abbreviated revision", () => {
    expect(
      isPinned(
        `https://raw.githubusercontent.com/cacack/gedcom-go/${revision.slice(0, 12)}/testdata/edge-cases/xref-case.ged`,
      ),
    ).toBe(false);
  });

  it("refuses a tag that merely looks like a revision", () => {
    expect(
      isPinned(
        `https://raw.githubusercontent.com/cacack/gedcom-go/v${revision}/testdata/x.ged`,
      ),
    ).toBe(false);
  });

  it("refuses what is not a location at all", () => {
    expect(isPinned("testdata/edge-cases/xref-case.ged")).toBe(false);
  });
});
