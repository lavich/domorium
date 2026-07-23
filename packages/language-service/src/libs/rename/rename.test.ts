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

    const unresolved = new GedcomLanguageService("1 HUSB @I9@", 1);
    expect(
      unresolved.prepareRename({ line: 0, character: 9 }),
    ).toMatchObject({ ok: false, code: "unresolved-declaration" });

    const duplicate = new GedcomLanguageService(
      ["0 @I1@ INDI", "0 @I1@ INDI"].join("\n"),
      1,
    );
    expect(
      duplicate.prepareRename({ line: 0, character: 4 }),
    ).toMatchObject({ ok: false, code: "duplicate-declaration" });
  });
});
