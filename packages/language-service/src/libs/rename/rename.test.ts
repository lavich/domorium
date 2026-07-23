import { describe, expect, it } from "vitest";
import { GedcomLanguageService } from "../../languageService";

const text = [
  "0 @I1@ INDI",
  "1 NOTE keep @I1@ as prose",
  "0 @F1@ FAM",
  "1 HUSB @I1@",
].join("\n");

describe("XREF rename", () => {
  it("prepares and generates minimal edits from a usage", () => {
    const service = new GedcomLanguageService(text, 4);

    expect(service.prepareRename({ line: 3, character: 9 })).toEqual({
      ok: true,
      range: {
        start: { line: 3, character: 7 },
        end: { line: 3, character: 11 },
      },
      placeholder: "@I1@",
      version: 4,
    });
    expect(service.rename({ line: 3, character: 9 }, "@I104@", 4)).toEqual({
      ok: true,
      edit: {
        version: 4,
        edits: [
          {
            range: {
              start: { line: 0, character: 2 },
              end: { line: 0, character: 6 },
            },
            newText: "@I104@",
          },
          {
            range: {
              start: { line: 3, character: 7 },
              end: { line: 3, character: 11 },
            },
            newText: "@I104@",
          },
        ],
      },
    });
  });

  it.each([
    ["I2", "invalid-new-id"],
    ["@I 2@", "invalid-new-id"],
    ["@I-2@", "invalid-new-id"],
    ["@😀@", "invalid-new-id"],
    ["@F1@", "identifier-collision"],
  ])("refuses invalid or colliding name %s", (newName, code) => {
    const service = new GedcomLanguageService(text, 4);
    expect(
      service.rename({ line: 0, character: 4 }, newName, 4),
    ).toMatchObject({ ok: false, code });
  });

  it("refuses stale, unresolved, and duplicate targets", () => {
    const stale = new GedcomLanguageService(text, 5);
    expect(
      stale.rename({ line: 0, character: 4 }, "@I2@", 4),
    ).toMatchObject({ ok: false, code: "stale-document" });

    const unresolved = new GedcomLanguageService(
      ["0 @F1@ FAM", "1 HUSB @I9@"].join("\n"),
      1,
    );
    expect(
      unresolved.prepareRename({ line: 1, character: 9 }),
    ).toMatchObject({ ok: false, code: "unresolved-declaration" });

    const duplicate = new GedcomLanguageService(
      ["0 @I1@ INDI", "0 @I1@ INDI"].join("\n"),
      1,
    );
    expect(
      duplicate.prepareRename({ line: 0, character: 4 }),
    ).toMatchObject({ ok: false, code: "duplicate-declaration" });
  });

  it("allows a new identifier that currently has unresolved usages only", () => {
    const service = new GedcomLanguageService(
      [text, "1 CHIL @I9@"].join("\n"),
      1,
    );

    expect(
      service.rename({ line: 0, character: 4 }, "@I9@", 1),
    ).toMatchObject({ ok: true });
  });

  it("does not rename XREF-shaped prose and preserves unrelated bytes", () => {
    const source = [
      "0 @I1@ INDI\r",
      "1 NOTE @I1@ 😀 prose\r",
      "1 _CUSTOM unchanged\r",
      "0 @F1@ FAM\r",
      "1 HUSB @I1@\r",
    ].join("\n");
    const service = new GedcomLanguageService(source, 1);
    const result = service.rename({ line: 4, character: 9 }, "@I2@", 1);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const lines = source.split("\n");
    for (const edit of [...result.edit.edits].reverse()) {
      const line = lines[edit.range.start.line];
      lines[edit.range.start.line] =
        line.slice(0, edit.range.start.character) +
        edit.newText +
        line.slice(edit.range.end.character);
    }
    expect(lines.join("\n")).toBe(
      source
        .replace("0 @I1@ INDI", "0 @I2@ INDI")
        .replace("1 HUSB @I1@", "1 HUSB @I2@"),
    );
  });

  it("renames references in GEDCOM 5.5.1", () => {
    const service = new GedcomLanguageService(
      [
        "0 HEAD",
        "1 GEDC",
        "2 VERS 5.5.1",
        "0 @I1@ INDI",
        "0 @F1@ FAM",
        "1 HUSB @I1@",
        "0 TRLR",
      ].join("\n"),
      7,
    );

    expect(
      service.rename({ line: 5, character: 9 }, "@I2@", 7),
    ).toMatchObject({ ok: true });
  });

  it("rejects an edit from before a sequential update", () => {
    const service = new GedcomLanguageService(text, 1);
    service.update(text.replace("HUSB", "WIFE"), 2);

    expect(
      service.rename({ line: 3, character: 9 }, "@I2@", 1),
    ).toMatchObject({ ok: false, code: "stale-document" });
  });
});
