import { describe, expect, it } from "vitest";
import { GedcomLanguageService } from "../../languageService";
import type { CodeAction, Position, TextEdit } from "../../types";

function apply(text: string, edits: TextEdit[]): string {
  const starts = [0];
  for (const match of text.matchAll(/\r\n|\n\r|\r|\n/gu)) {
    starts.push(match.index + match[0].length);
  }
  const offset = ({ line, character }: Position) =>
    Math.min((starts[line] ?? text.length) + character, text.length);
  let result = "";
  let cursor = 0;
  for (const edit of [...edits].sort(
    (left, right) => offset(left.range.start) - offset(right.range.start),
  )) {
    result += text.slice(cursor, offset(edit.range.start)) + edit.newText;
    cursor = offset(edit.range.end);
  }
  return result + text.slice(cursor);
}

function fixAllOf(text: string): CodeAction[] {
  const result = new GedcomLanguageService(text, 1).getFixAll(1);
  if (!Array.isArray(result)) {
    throw new Error(result.code);
  }
  return result;
}

function fixed(text: string): string {
  const [action] = fixAllOf(text);
  return apply(text, action.edit!.edits);
}

function diagnosticCodes(text: string): string[] {
  return new GedcomLanguageService(text, 1).getDiagnostics().map((d) => d.code);
}

describe("fix all", () => {
  it("adds the header and the trailer to an empty document", () => {
    const [action] = fixAllOf("");
    expect(action.kind).toBe("source.fixAll");
    expect(action.edit!.edits.map((edit) => edit.newText)).toEqual([
      "0 HEAD\n1 GEDC\n2 VERS 7.0\n",
      "0 TRLR\n",
    ]);
    expect(diagnosticCodes(fixed(""))).toEqual([]);
  });

  it("repairs a missing header, a missing trailer and wrong levels together", () => {
    const text = "0 @I1@ INDI\n2 NAME A /B/\n1 SEX M\n";
    expect(diagnosticCodes(text).length).toBeGreaterThanOrEqual(2);
    expect(diagnosticCodes(fixed(text))).toEqual([]);
    expect(fixed(text)).toContain("1 NAME A /B/");
  });

  it("writes the document's own terminator and a bare level", () => {
    const [action] = fixAllOf("0 @I1@ INDI\r\n2 NAME A /B/\r\n");
    expect(action.edit!.edits.map((edit) => edit.newText)).toEqual([
      "0 HEAD\r\n1 GEDC\r\n2 VERS 7.0\r\n",
      "1",
      "0 TRLR\r\n",
    ]);
  });

  it("repairs a CRLF document completely", () => {
    const text = "0 @I1@ INDI\r\n2 NAME A /B/\r\n";
    expect(diagnosticCodes(fixed(text))).toEqual([]);
  });

  it("drops level fixes that uncover another wrong level", () => {
    const text =
      "0 HEAD\n1 GEDC\n2 VERS 7.0\n0 @I1@ INDI\n2 NAME A /B/\n3 GIVN B\n0 TRLR\n";
    expect(fixAllOf(text)).toEqual([]);
  });

  it("keeps the trailer when the level fixes are dropped", () => {
    const text =
      "0 HEAD\n1 GEDC\n2 VERS 7.0\n0 @I1@ INDI\n2 NAME A /B/\n3 GIVN B\n";
    const [action] = fixAllOf(text);
    expect(action.edit!.edits.map((edit) => edit.newText)).toEqual([
      "0 TRLR\n",
    ]);
  });

  it("offers nothing for a document with no safe fix", () => {
    const text =
      "0 HEAD\n1 GEDC\n2 VERS 7.0\n0 @F1@ FAM\n1 HUSB @I9@\n0 TRLR\n";
    expect(diagnosticCodes(text)).toContain("unresolved-xref");
    expect(fixAllOf(text)).toEqual([]);
  });

  it("offers nothing for a valid document", () => {
    expect(fixAllOf("0 HEAD\n1 GEDC\n2 VERS 7.0\n0 TRLR\n")).toEqual([]);
  });

  it("refuses a stale version", () => {
    const service = new GedcomLanguageService("", 4);
    expect(service.getFixAll(3)).toMatchObject({
      ok: false,
      code: "stale-document",
    });
  });

  it("is idempotent", () => {
    const text = "0 @I1@ INDI\n2 NAME A /B/\n";
    expect(fixAllOf(fixed(text))).toEqual([]);
  });
});
