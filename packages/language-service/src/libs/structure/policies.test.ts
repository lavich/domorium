import { describe, expect, it } from "vitest";

import { GedcomLanguageService } from "../../languageService";
import { applyEdits } from "../position/applyEdits";

const HEADERS = [
  ["7.0", ["0 HEAD", "1 GEDC", "2 VERS 7.0"]],
  [
    "5.5.1",
    [
      "0 HEAD",
      "1 GEDC",
      "2 VERS 5.5.1",
      "2 FORM LINEAGE-LINKED",
      "1 CHAR UTF-8",
    ],
  ],
] as const;

const at = (line: number) => ({ line, character: 0 });

describe.each(HEADERS)(
  "a name payload and its parts in %s",
  (_dialect, header) => {
    const base = header.length;

    function run(
      lines: string[],
      act: (
        service: GedcomLanguageService,
      ) => ReturnType<GedcomLanguageService["setValue"]>,
    ): string[] {
      const text = [...header, ...lines].join("\n");
      const result = act(new GedcomLanguageService(text));
      if (!result.ok) {
        throw new Error(`refused: ${result.code} ${result.message}`);
      }
      return applyEdits(text, result.edit.edits).split("\n").slice(base);
    }

    it("writes the payload of a name added with both parts and no payload", () => {
      const next = run(["0 @I1@ INDI", "0 TRLR"], (service) =>
        service.addStructure(
          at(base),
          "NAME",
          {
            children: [
              { tag: "GIVN", value: "Anna" },
              { tag: "SURN", value: "Lee" },
            ],
          },
          0,
        ),
      );

      expect(next).toEqual([
        "0 @I1@ INDI",
        "1 NAME Anna /Lee/",
        "2 GIVN Anna",
        "2 SURN Lee",
        "0 TRLR",
      ]);
    });

    it("leaves a payload that was given", () => {
      const next = run(["0 @I1@ INDI", "0 TRLR"], (service) =>
        service.addStructure(
          at(base),
          "NAME",
          {
            value: "Anna Maria /Lee/",
            children: [{ tag: "GIVN", value: "Anna" }],
          },
          0,
        ),
      );

      expect(next[1]).toBe("1 NAME Anna Maria /Lee/");
    });

    it("follows a changed surname", () => {
      const next = run(
        [
          "0 @I1@ INDI",
          "1 NAME Anna /Lee/",
          "2 GIVN Anna",
          "2 SURN Lee",
          "0 TRLR",
        ],
        (service) => service.setValue(at(base + 3), { value: "Poe" }, 0),
      );

      expect(next.slice(1, 4)).toEqual([
        "1 NAME Anna /Poe/",
        "2 GIVN Anna",
        "2 SURN Poe",
      ]);
    });

    it("keeps a prefix, a suffix and the spacing the author wrote", () => {
      const next = run(
        [
          "0 @I1@ INDI",
          "1 NAME Dr. Anna /de Lee/ Jr.",
          "2 SURN de Lee",
          "0 TRLR",
        ],
        (service) => service.setValue(at(base + 2), { value: "Poe" }, 0),
      );

      expect(next[1]).toBe("1 NAME Dr. Anna /Poe/ Jr.");
    });

    it("follows a changed given name without touching the surname", () => {
      const next = run(
        ["0 @I1@ INDI", "1 NAME Dr. Anna /Lee/", "2 GIVN Anna", "0 TRLR"],
        (service) => service.setValue(at(base + 2), { value: "Bea" }, 0),
      );

      expect(next.slice(1, 3)).toEqual(["1 NAME Dr. Bea /Lee/", "2 GIVN Bea"]);
    });

    it("leaves a payload whose slashes do not hold the old surname", () => {
      const next = run(
        ["0 @I1@ INDI", "1 NAME Anna /Lee/", "2 SURN Other", "0 TRLR"],
        (service) => service.setValue(at(base + 2), { value: "Poe" }, 0),
      );

      expect(next.slice(1, 3)).toEqual(["1 NAME Anna /Lee/", "2 SURN Poe"]);
    });

    it("does not touch a payload when another part is set", () => {
      const next = run(
        ["0 @I1@ INDI", "1 NAME Anna /Lee/", "2 NICK Ann", "0 TRLR"],
        (service) => service.setValue(at(base + 2), { value: "Annie" }, 0),
      );

      expect(next.slice(1, 3)).toEqual(["1 NAME Anna /Lee/", "2 NICK Annie"]);
    });

    it("replaces a given name as a word and not inside another word", () => {
      const next = run(
        ["0 @I1@ INDI", "1 NAME Annabel Ann /Lee/", "2 GIVN Ann", "0 TRLR"],
        (service) => service.setValue(at(base + 2), { value: "Bea" }, 0),
      );

      expect(next.slice(1, 3)).toEqual([
        "1 NAME Annabel Bea /Lee/",
        "2 GIVN Bea",
      ]);
    });

    it("leaves the payload when the new value would add a slash", () => {
      const next = run(
        ["0 @I1@ INDI", "1 NAME Anna /Lee/", "2 SURN Lee", "0 TRLR"],
        (service) => service.setValue(at(base + 2), { value: "Le/e" }, 0),
      );

      expect(next[1]).toBe("1 NAME Anna /Lee/");
    });
  },
);
