import { describe, expect, test } from "vitest";
import { resolveGedcomVersion } from "./versionRegistry";
import { ConfigurableLexer } from "../parser/lexer";
import { buildAst } from "../parser/ast";

const astFor = (versLine: string) => {
  const text = `0 HEAD\n1 GEDC\n${versLine}\n0 TRLR\n`;
  return buildAst(
    new ConfigurableLexer({ zeroBased: true }).tokenize(text).tokens,
    text,
  );
};

describe("resolveGedcomVersion", () => {
  test.each([["7.0"], ["5.5.1"]])("%s is supported", (vers) => {
    expect(resolveGedcomVersion(astFor(`2 VERS ${vers}`).nodes)).toMatchObject({
      kind: "supported",
      version: vers,
    });
  });

  test.each([["5.5.5"], ["5.5"], ["5.5 EL"]])(
    "%s is substituted by 5.5.1",
    (vers) => {
      expect(
        resolveGedcomVersion(astFor(`2 VERS ${vers}`).nodes),
      ).toMatchObject({ kind: "substituted", version: vers, dialect: "5.5.1" });
    },
  );

  test.each([["5.6"], ["5.4"], ["5.3"], ["5.0"], ["4.0"], ["3.0"], ["x"]])(
    "%s is unsupported",
    (vers) => {
      expect(
        resolveGedcomVersion(astFor(`2 VERS ${vers}`).nodes),
      ).toMatchObject({ kind: "unsupported", version: vers });
    },
  );

  test("no VERS value is undetermined", () => {
    expect(resolveGedcomVersion(astFor("2 VERS").nodes)).toMatchObject({
      kind: "undetermined",
    });
  });

  test("no GEDC at all is undetermined", () => {
    const text = "0 HEAD\n0 @I1@ INDI\n0 TRLR\n";
    const { nodes } = buildAst(
      new ConfigurableLexer({ zeroBased: true }).tokenize(text).tokens,
      text,
    );

    expect(resolveGedcomVersion(nodes)).toMatchObject({
      kind: "undetermined",
    });
  });

  // 5.5.5 and 5.5 EL both begin with 5.5, so a match found by table order
  // rather than by length would resolve them as 5.5.
  test("a longer match wins over a shorter one that prefixes it", () => {
    expect(resolveGedcomVersion(astFor("2 VERS 5.5.5").nodes)).toMatchObject({
      version: "5.5.5",
    });
    expect(resolveGedcomVersion(astFor("2 VERS 5.5 EL").nodes)).toMatchObject({
      version: "5.5 EL",
    });
  });

  test("carries the schema the version asked for", () => {
    const seven = resolveGedcomVersion(astFor("2 VERS 7.0").nodes);
    const five = resolveGedcomVersion(astFor("2 VERS 5.5").nodes);

    expect(
      "scheme" in seven &&
        "https://gedcom.io/terms/v7/TITL" in seven.scheme.payload,
    ).toBe(true);
    expect(
      "scheme" in five &&
        "https://gedcom.io/terms/v5.5.1/TRLR" in five.scheme.payload,
    ).toBe(true);
  });

  test("points at the version value", () => {
    expect(
      resolveGedcomVersion(astFor("2 VERS 4.0").nodes).range.start.line,
    ).toBe(2);
  });

  test("falls back to the header when there is no version", () => {
    expect(resolveGedcomVersion(astFor("2 VERS").nodes).range.start.line).toBe(
      0,
    );
  });
});
