import { describe, expect, it } from "vitest";

import { GedcomLanguageService } from "../../languageService";

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
  "a pointer with a reciprocal in %s",
  (_dialect, header) => {
    const base = header.length;
    const text = [
      ...header,
      "0 @I1@ INDI",
      "1 NAME A /B/",
      "1 FAMS @F1@",
      "1 BIRT",
      "2 FAMC @F1@",
      "0 @F1@ FAM",
      "1 HUSB @I1@",
      "0 TRLR",
    ].join("\n");
    const service = () => new GedcomLanguageService(text);

    it.each([
      [
        "a child family on a person",
        () => service().addStructure(at(base), "FAMC", { pointer: "@F1@" }, 0),
      ],
      [
        "a spouse family on a person",
        () => service().addStructure(at(base), "FAMS", { pointer: "@F1@" }, 0),
      ],
      [
        "a child on a family",
        () =>
          service().addStructure(at(base + 5), "CHIL", { pointer: "@I1@" }, 0),
      ],
      [
        "a wife on a family",
        () =>
          service().addStructure(at(base + 5), "WIFE", { pointer: "@I1@" }, 0),
      ],
      [
        "a child family on a birth",
        () =>
          service().addStructure(at(base + 3), "FAMC", { pointer: "@F1@" }, 0),
      ],
      [
        "a set of a spouse family",
        () => service().setValue(at(base + 2), { pointer: "@F1@" }, 0),
      ],
      [
        "a set of a husband",
        () => service().setValue(at(base + 6), { pointer: "@I1@" }, 0),
      ],
      [
        "a removal of a spouse family",
        () => service().removeStructure(at(base + 2), 0),
      ],
      [
        "a removal of a structure that holds a child family",
        () => service().removeStructure(at(base + 3), 0),
      ],
      [
        "a death added with a child family beneath it",
        () =>
          service().addStructure(
            at(base),
            "DEAT",
            { children: [{ tag: "FAMC", pointer: "@F1@" }] },
            0,
          ),
      ],
    ])("refuses %s", (_name, act) => {
      expect(act()).toMatchObject({
        ok: false,
        code: "reciprocal-pointer-unsupported",
      });
    });

    it("does not refuse a pointer that has no reciprocal", () => {
      const withSource = new GedcomLanguageService(
        [
          ...header,
          "0 @I1@ INDI",
          "1 NAME A /B/",
          "0 @S1@ SOUR",
          "0 TRLR",
        ].join("\n"),
      );

      expect(
        withSource.addStructure(at(base + 1), "SOUR", { pointer: "@S1@" }, 0),
      ).toMatchObject({
        ok: true,
      });
    });
  },
);
