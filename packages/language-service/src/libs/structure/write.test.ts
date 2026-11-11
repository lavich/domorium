import { describe, expect, it } from "vitest";
import { unescapePayload, resolveValue } from "@domorium/validator";

import { GedcomLanguageService } from "../../languageService";
import { writeValueLines } from "./write";

function readBack(lines: string[], dialect: "5.5.1" | "7.0"): string {
  const header =
    dialect === "7.0"
      ? ["0 HEAD", "1 GEDC", "2 VERS 7.0"]
      : [
          "0 HEAD",
          "1 GEDC",
          "2 VERS 5.5.1",
          "2 FORM LINEAGE-LINKED",
          "1 CHAR UTF-8",
        ];
  const service = new GedcomLanguageService(
    [...header, "0 @I1@ INDI", ...lines, "0 TRLR"].join("\n"),
  );
  const node = service
    .getDocument()
    .getNodes()
    .find((entry) => entry.tokens.TAG?.value === "INDI")!.children[0];
  return unescapePayload(resolveValue(node), dialect, "text");
}

describe("writing a value as lines", () => {
  it("writes a line break as a CONT line", () => {
    expect(writeValueLines(1, "NOTE", "one\ntwo", "text", "7.0", "\n")).toEqual(
      ["1 NOTE one", "2 CONT two"],
    );
  });

  it("writes an empty value as the bare line, and an empty continuation as a bare CONT", () => {
    expect(writeValueLines(1, "NOTE", "", "text", "7.0", "\n")).toEqual([
      "1 NOTE",
    ]);
    expect(writeValueLines(1, "NOTE", "a\n\nb", "text", "7.0", "\n")).toEqual([
      "1 NOTE a",
      "2 CONT",
      "2 CONT b",
    ]);
  });

  it("escapes an at sign by dialect and kind", () => {
    expect(writeValueLines(2, "NICK", "a@b", "text", "5.5.1", "\n")).toEqual([
      "2 NICK a@@b",
    ]);
    expect(writeValueLines(2, "NICK", "@a", "text", "7.0", "\n")).toEqual([
      "2 NICK @@a",
    ]);
    expect(
      writeValueLines(2, "SOUR", "@S1@", "pointer", "5.5.1", "\n"),
    ).toEqual(["2 SOUR @S1@"]);
    expect(
      writeValueLines(
        2,
        "DATE",
        "@#DJULIAN@ 3 MAR 1721",
        "date",
        "5.5.1",
        "\n",
      ),
    ).toEqual(["2 DATE @#DJULIAN@ 3 MAR 1721"]);
  });

  it("continues a long 5.5.1 value with CONC, each whole line within 255 characters", () => {
    const value = "word ".repeat(60).trim();

    const lines = writeValueLines(1, "NOTE", value, "text", "5.5.1", "\n");

    expect(lines.length).toBeGreaterThan(1);
    expect(lines.slice(1).every((line) => line.startsWith("2 CONC "))).toBe(
      true,
    );
    expect(lines.every((line) => line.length + 1 <= 255)).toBe(true);
    expect(lines.every((line) => !line.endsWith(" "))).toBe(true);
    expect(readBack(lines, "5.5.1")).toBe(value);
  });

  it("counts a CRLF terminator against the line", () => {
    const lines = writeValueLines(
      1,
      "NOTE",
      "x".repeat(300),
      "text",
      "5.5.1",
      "\r\n",
    );

    expect(lines.every((line) => line.length + 2 <= 255)).toBe(true);
    expect(readBack(lines, "5.5.1")).toBe("x".repeat(300));
  });

  it("does not split inside an escaped at sign or a surrogate pair", () => {
    const value = `${"@".repeat(130)}${"😀".repeat(80)}`;

    const lines = writeValueLines(1, "NOTE", value, "text", "5.5.1", "\n");

    expect(lines.every((line) => line.length + 1 <= 255)).toBe(true);
    expect(readBack(lines, "5.5.1")).toBe(value);
  });

  it("does not split a long 7.0 value", () => {
    const value = "x".repeat(300);

    expect(writeValueLines(1, "NOTE", value, "text", "7.0", "\n")).toEqual([
      `1 NOTE ${value}`,
    ]);
  });

  it.each(["5.5.1", "7.0"] as const)(
    "reads back a value with a line break, an at sign and 300 characters in %s",
    (dialect) => {
      const value = `@start and a@b\n@second line\n${"y".repeat(300)}`;

      expect(
        readBack(
          writeValueLines(1, "NOTE", value, "text", dialect, "\n"),
          dialect,
        ),
      ).toBe(value);
    },
  );

  it("does not cut a surrogate pair when it steps back to avoid a space", () => {
    const value = `${"a".repeat(245)}😀 ${"b".repeat(50)}`;

    const lines = writeValueLines(1, "NOTE", value, "text", "5.5.1", "\n");

    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join("")).not.toMatch(
      /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/,
    );
  });

  it("never starts or ends a continuation piece with a space", () => {
    const lines = writeValueLines(
      1,
      "NOTE",
      "word ".repeat(200).trim(),
      "text",
      "5.5.1",
      "\n",
    );

    for (const line of lines.slice(1)) {
      expect(line.slice("2 CONC ".length)).toMatch(/^\S(.*\S)?$/);
    }
    expect(lines[0].endsWith(" ")).toBe(false);
  });
});
