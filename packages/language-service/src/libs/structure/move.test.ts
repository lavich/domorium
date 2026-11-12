import { describe, expect, it } from "vitest";

import { GedcomLanguageService } from "../../languageService";
import type {
  EditRefusal,
  MoveDescription,
  MoveTarget,
  StructureEditResult,
} from "../../types";
import { applyEdits } from "../position/applyEdits";

const G7 = ["0 HEAD", "1 GEDC", "2 VERS 7.0"];
const G551 = [
  "0 HEAD",
  "1 GEDC",
  "2 VERS 5.5.1",
  "2 FORM LINEAGE-LINKED",
  "1 CHAR UTF-8",
];
const DIALECTS = [
  ["7.0", G7],
  ["5.5.1", G551],
] as const;

type Result = StructureEditResult | EditRefusal;

function accepted(result: Result): StructureEditResult {
  if (!result.ok) {
    throw new Error(`refused: ${result.code} ${result.message}`);
  }
  return result;
}

function refused(result: Result | MoveDescription): EditRefusal {
  if (result.ok) {
    throw new Error("expected a refusal");
  }
  return result;
}

function described(result: MoveDescription | EditRefusal): MoveDescription {
  if (!result.ok) {
    throw new Error(`refused: ${result.code} ${result.message}`);
  }
  return result;
}

const textOf = (lines: string[], eol = "\n") => lines.join(eol);
const at = (line: number) => ({ line, character: 0 });
const before = (line: number): MoveTarget => ({ before: at(line) });
const END: MoveTarget = { end: true };

function moved(text: string, line: number, target: MoveTarget): string {
  const service = new GedcomLanguageService(text);
  return applyEdits(
    text,
    accepted(service.moveStructure(at(line), target, 0)).edit.edits,
  );
}

function reading(text: string): string[] {
  return new GedcomLanguageService(text)
    .getDiagnostics()
    .map((diagnostic) => `${diagnostic.code} ${diagnostic.message}`)
    .sort();
}

describe.each(DIALECTS)("moving a structure in %s", (_dialect, header) => {
  const base = header.length;
  const person = [
    ...header,
    "0 @I1@ INDI",
    "1 NAME Anna /Lee/",
    "2 GIVN Anna",
    "1 NAME Ann /Lee/",
    "2 GIVN Ann",
    "2 NOTE spoken",
    "1 BIRT",
    "2 DATE 1 JAN 1900",
    "1 RESI",
    "2 PLAC Oslo",
    "1 DEAT",
    "2 DATE 1980",
    "1 _MILITARY Cavalry",
    "2 DATE 1918",
    "0 TRLR",
  ];

  it("puts the second name before the first", () => {
    expect(moved(textOf(person), base + 3, before(base + 1))).toBe(
      textOf([
        ...header,
        "0 @I1@ INDI",
        "1 NAME Ann /Lee/",
        "2 GIVN Ann",
        "2 NOTE spoken",
        "1 NAME Anna /Lee/",
        "2 GIVN Anna",
        ...person.slice(base + 6),
      ]),
    );
  });

  it("moves an event among the others", () => {
    const next = moved(textOf(person), base + 10, before(base + 8));

    expect(next.split("\n").slice(base + 6, base + 12)).toEqual([
      "1 BIRT",
      "2 DATE 1 JAN 1900",
      "1 DEAT",
      "2 DATE 1980",
      "1 RESI",
      "2 PLAC Oslo",
    ]);
  });

  it("moves a custom line with the line beneath it", () => {
    const next = moved(textOf(person), base + 12, before(base + 6));

    expect(next.split("\n").slice(base + 6, base + 9)).toEqual([
      "1 _MILITARY Cavalry",
      "2 DATE 1918",
      "1 BIRT",
    ]);
  });

  it("moves a note with its continuation and its substructure to the end", () => {
    const text = textOf([
      ...header,
      "0 @I1@ INDI",
      "1 NOTE first",
      "2 CONT second",
      "2 LANG en",
      "1 SEX F",
      "0 TRLR",
    ]);

    expect(moved(text, base + 1, END)).toBe(
      textOf([
        ...header,
        "0 @I1@ INDI",
        "1 SEX F",
        "1 NOTE first",
        "2 CONT second",
        "2 LANG en",
        "0 TRLR",
      ]),
    );
  });

  it("moves before the first sibling of a parent and after its continuation", () => {
    const text = textOf([
      ...header,
      "0 @I1@ INDI",
      "1 NOTE first",
      "2 CONT second",
      "2 LANG en",
      "2 _X y",
      "0 TRLR",
    ]);

    expect(moved(text, base + 4, before(base + 3))).toBe(
      textOf([
        ...header,
        "0 @I1@ INDI",
        "1 NOTE first",
        "2 CONT second",
        "2 _X y",
        "2 LANG en",
        "0 TRLR",
      ]),
    );
  });

  it("names a structure by its continuation line and a sibling by its own", () => {
    const text = textOf([
      ...header,
      "0 @I1@ INDI",
      "1 SEX F",
      "1 NOTE first",
      "2 CONT second",
      "0 TRLR",
    ]);

    expect(moved(text, base + 3, before(base + 1))).toBe(
      moved(text, base + 2, before(base + 1)),
    );
    expect(moved(text, base + 1, before(base + 3))).toBe(text);
  });

  it("keeps a text with no final terminator without one", () => {
    const text = textOf([
      ...header,
      "0 @I1@ INDI",
      "1 NAME A /B/",
      "2 GIVN A",
      "2 NICK x",
    ]);

    expect(moved(text, base + 3, before(base + 2))).toBe(
      textOf([
        ...header,
        "0 @I1@ INDI",
        "1 NAME A /B/",
        "2 NICK x",
        "2 GIVN A",
      ]),
    );
  });

  it("moves to the end where the last sibling ends a text with no final terminator", () => {
    const text = textOf([
      ...header,
      "0 @I1@ INDI",
      "1 NAME A /B/",
      "2 GIVN A",
      "1 SEX F",
    ]);

    expect(moved(text, base + 1, END)).toBe(
      textOf([...header, "0 @I1@ INDI", "1 SEX F", "1 NAME A /B/", "2 GIVN A"]),
    );
  });

  it("writes the terminator of a document with \\r\\n", () => {
    const next = moved(textOf(person, "\r\n"), base + 3, before(base + 1));

    expect(next.replaceAll("\r\n", "")).not.toMatch(/[\r\n]/);
    expect(next.split("\r\n")).toHaveLength(person.length);
  });

  it.each([
    ["before its sibling", ["1 SEX F", "1 NAME A /B/"], 2, before(base + 1)],
    ["to the end", ["1 NAME A /B/", "1 SEX F"], 1, END],
  ])(
    "writes \\r\\n where a move %s meets the end of the text",
    (_name, children, line, target) => {
      const text = textOf([...header, "0 @I1@ INDI", ...children], "\r\n");

      expect(moved(text, base + line, target)).toBe(
        textOf([...header, "0 @I1@ INDI", ...[...children].reverse()], "\r\n"),
      );
    },
  );

  it("keeps the terminators of the moved lines in a file that mixes them", () => {
    const text = [
      textOf([...header, "0 @I1@ INDI", "1 SEX F"], "\r\n"),
      "\r\n1 NAME A /B/\n2 GIVN A\n",
      "0 TRLR\r\n",
    ].join("");

    expect(moved(text, base + 2, before(base + 1))).toBe(
      [
        textOf([...header, "0 @I1@ INDI"], "\r\n"),
        "\r\n1 NAME A /B/\n2 GIVN A\n1 SEX F\r\n",
        "0 TRLR\r\n",
      ].join(""),
    );
  });

  it("moves to the end before a stray continuation of the parent", () => {
    const text = textOf([
      ...header,
      "0 @I1@ INDI",
      "1 NOTE first",
      "2 LANG en",
      "2 _X y",
      "2 CONT second",
      "0 TRLR",
    ]);

    expect(
      moved(text, base + 2, END)
        .split("\n")
        .slice(base + 2, base + 5),
    ).toEqual(["2 _X y", "2 LANG en", "2 CONT second"]);
  });

  it("moves a line the lexer could not read with the structure above it", () => {
    const text = textOf([
      ...header,
      "0 @I1@ INDI",
      "1 NAME A /B/",
      "2 GIVN A",
      "2 \u0001bad",
      "1 SEX F",
      "0 TRLR",
    ]);

    expect(moved(text, base + 1, END)).toBe(
      textOf([
        ...header,
        "0 @I1@ INDI",
        "1 SEX F",
        "1 NAME A /B/",
        "2 GIVN A",
        "2 \u0001bad",
        "0 TRLR",
      ]),
    );
  });

  it("leaves a blank line between records where it was", () => {
    const text = textOf([
      ...header,
      "0 @I1@ INDI",
      "1 NAME A /B/",
      "1 SEX F",
      "",
      "0 TRLR",
    ]);

    expect(moved(text, base + 2, before(base + 1))).toBe(
      textOf([
        ...header,
        "0 @I1@ INDI",
        "1 SEX F",
        "1 NAME A /B/",
        "",
        "0 TRLR",
      ]),
    );
  });

  it("ends a block that ended the text with the terminator of the line it follows", () => {
    const text = [
      textOf(header, "\r\n"),
      "\r\n0 @I1@ INDI\n1 NAME A /B/\n1 SEX F",
    ].join("");

    expect(moved(text, base + 2, before(base + 1))).toBe(
      [textOf(header, "\r\n"), "\r\n0 @I1@ INDI\n1 SEX F\n1 NAME A /B/"].join(
        "",
      ),
    );
  });

  it("moves a pointer that has a reciprocal", () => {
    const records = (famc: string[], chil: string[]) =>
      textOf([
        ...header,
        "0 @I1@ INDI",
        ...famc,
        "0 @I2@ INDI",
        "1 FAMC @F1@",
        "0 @F1@ FAM",
        ...chil,
        "0 @F2@ FAM",
        "1 CHIL @I1@",
        "0 TRLR",
      ]);
    const text = records(
      ["1 FAMC @F1@", "1 FAMC @F2@"],
      ["1 CHIL @I1@", "1 CHIL @I2@"],
    );

    expect(moved(text, base + 2, before(base + 1))).toBe(
      records(["1 FAMC @F2@", "1 FAMC @F1@"], ["1 CHIL @I1@", "1 CHIL @I2@"]),
    );
    expect(moved(text, base + 7, before(base + 6))).toBe(
      records(["1 FAMC @F1@", "1 FAMC @F2@"], ["1 CHIL @I2@", "1 CHIL @I1@"]),
    );
  });

  it("moves a substructure of the header", () => {
    const text = textOf([...header, "1 SOUR app", "1 LANG en", "0 TRLR"]);

    expect(moved(text, base + 1, before(base))).toBe(
      textOf([...header, "1 LANG en", "1 SOUR app", "0 TRLR"]),
    );
  });

  it.each([
    ["onto itself", base + 3, before(base + 3)],
    ["before the sibling after it", base + 3, before(base + 6)],
    ["the last sibling to the end", base + 12, END],
  ])("answers an empty edit for a move %s", (_name, line, target) => {
    const service = new GedcomLanguageService(textOf(person));

    expect(service.moveStructure(at(line), target, 0)).toEqual({
      ok: true,
      edit: { version: 0, edits: [] },
      warnings: [],
    });
  });

  it.each([
    ["a structure under another parent", base + 15],
    ["a line beneath a sibling", base + 4],
    ["the parent", base],
    ["a line beyond the text", 99],
  ])("refuses a target on %s", (_name, line) => {
    const text = textOf([
      ...person.slice(0, -1),
      "0 @I2@ INDI",
      "1 NAME Bo /Lee/",
      "0 TRLR",
    ]);
    const service = new GedcomLanguageService(text);

    expect(
      refused(service.moveStructure(at(base + 1), before(line), 0)).code,
    ).toBe("not-a-sibling");
  });

  it("refuses a target that names no slot", () => {
    const service = new GedcomLanguageService(textOf(person));

    for (const target of [{ end: false }, {}, { before: null }]) {
      expect(
        refused(
          service.moveStructure(
            at(base + 1),
            target as unknown as MoveTarget,
            0,
          ),
        ).code,
      ).toBe("not-a-sibling");
    }
  });

  it("refuses a target on a continuation of the parent", () => {
    const text = textOf([
      ...header,
      "0 @I1@ INDI",
      "1 NOTE first",
      "2 CONT second",
      "2 LANG en",
      "0 TRLR",
    ]);
    const service = new GedcomLanguageService(text);

    expect(
      refused(service.moveStructure(at(base + 3), before(base + 2), 0)).code,
    ).toBe("not-a-sibling");
  });

  it("refuses a position on a continuation of a continuation", () => {
    const service = new GedcomLanguageService(
      textOf([
        ...header,
        "0 @I1@ INDI",
        "1 NOTE x",
        "2 CONT a",
        "3 CONT b",
        "2 LANG en",
        "0 TRLR",
      ]),
    );

    expect(refused(service.moveStructure(at(base + 3), END, 0)).code).toBe(
      "not-a-structure",
    );
    expect(refused(service.describeMove(at(base + 3))).code).toBe(
      "not-a-structure",
    );
  });

  it("refuses to move a record", () => {
    const service = new GedcomLanguageService(textOf(person));

    expect(refused(service.moveStructure(at(base), END, 0)).code).toBe(
      "record-edit-unsupported",
    );
    expect(refused(service.describeMove(at(base))).code).toBe(
      "record-edit-unsupported",
    );
  });

  it.each([
    ["no structure", ["0 TRLR"], 99],
    [
      "a structure under a line with no level",
      ["garbage", "1 DEAT", "0 TRLR"],
      1,
    ],
    [
      "a structure under a line with no tag",
      ["0 @I1@ INDI", "1", "2 DATE 1900", "2 PLAC x", "0 TRLR"],
      2,
    ],
  ])("refuses a position on %s", (_name, lines, line) => {
    const service = new GedcomLanguageService(textOf([...header, ...lines]));

    expect(refused(service.moveStructure(at(base + line), END, 0)).code).toBe(
      "not-a-structure",
    );
    expect(refused(service.describeMove(at(base + line))).code).toBe(
      "not-a-structure",
    );
  });

  it("refuses a stale version, even for a move that keeps the order", () => {
    const service = new GedcomLanguageService(textOf(person));

    expect(
      refused(service.moveStructure(at(base + 3), before(base + 1), 1)).code,
    ).toBe("stale-document");
    expect(
      refused(service.moveStructure(at(base + 3), before(base + 3), 1)).code,
    ).toBe("stale-document");
  });

  it("leaves the diagnostics of the document as they were", () => {
    const text = textOf([
      ...header,
      "0 @I1@ INDI",
      "1 BIRT",
      "2 DATE not a date",
      "1 SEX Q",
      "1 SEX F",
      "1 FAMS @F9@",
      "1 DEAT",
      "0 TRLR",
    ]);
    const service = new GedcomLanguageService(text);

    const result = accepted(
      service.moveStructure(at(base + 1), before(base + 6), 0),
    );

    expect(result.warnings).toEqual([]);
    expect(reading(applyEdits(text, result.edit.edits))).toEqual(reading(text));
    expect(reading(text).length).toBeGreaterThan(0);
  });

  it("refuses to move a sibling written at a wrong level", () => {
    const text = textOf([
      ...header,
      "0 @I1@ INDI",
      "1 BIRT",
      "3 DATE 1900",
      "2 PLAC x",
      "0 TRLR",
    ]);
    const service = new GedcomLanguageService(text);

    expect(
      refused(service.moveStructure(at(base + 3), before(base + 2), 0)).code,
    ).toBe("reading-changed");
  });

  it("describes every slot among the siblings in file order", () => {
    const service = new GedcomLanguageService("");
    service.update(textOf(person), 4);

    const description = described(service.describeMove(at(base + 8)));

    expect(description.version).toBe(4);
    expect(description.range).toEqual({
      start: at(base + 8),
      end: { line: base + 8, character: 6 },
    });
    expect(description.subtreeRange).toEqual({
      start: at(base + 8),
      end: { line: base + 9, character: 11 },
    });
    expect(description.slots).toEqual([
      { target: before(base + 1), changesOrder: true },
      { target: before(base + 3), changesOrder: true },
      { target: before(base + 6), changesOrder: true },
      { target: before(base + 8), changesOrder: false },
      { target: before(base + 10), changesOrder: false },
      { target: before(base + 12), changesOrder: true },
      { target: END, changesOrder: true },
    ]);
  });

  it("describes the slots of an only child as keeping the order", () => {
    const service = new GedcomLanguageService(textOf(person));

    expect(described(service.describeMove(at(base + 7))).slots).toEqual([
      { target: before(base + 7), changesOrder: false },
      { target: END, changesOrder: false },
    ]);
  });

  it("lists no slot before a line with no tag", () => {
    const service = new GedcomLanguageService(
      textOf([...header, "0 @I1@ INDI", "1 BIRT", "1", "1 DEAT", "0 TRLR"]),
    );

    expect(
      described(service.describeMove(at(base + 1))).slots.map(
        (slot) => slot.target,
      ),
    ).toEqual([before(base + 1), before(base + 3), END]);
  });

  it("accepts a move to every slot of every substructure outside the header", () => {
    const text = textOf([
      ...person.slice(0, -1),
      "1 SEX Q",
      "1 FAMS @F9@",
      "2 NOTE a",
      "2 CONT b",
      "0 TRLR",
    ]);
    const service = new GedcomLanguageService(text);

    for (let line = base + 1; line < text.split("\n").length - 1; line++) {
      const description = described(service.describeMove(at(line)));
      for (const slot of description.slots) {
        accepted(service.moveStructure(at(line), slot.target, 0));
      }
    }
  });
});

describe("a move that changes how the document is read", () => {
  it("is refused when the version is then named after a system", () => {
    const service = new GedcomLanguageService(
      textOf([
        "0 HEAD",
        "1 GEDC",
        "2 VERS 7.0",
        "1 SYST x",
        "0 @I1@ INDI",
        "1 SEX Q",
        "0 TRLR",
      ]),
    );

    expect(refused(service.moveStructure(at(1), END, 0)).code).toBe(
      "reading-changed",
    );
  });

  it("is refused when another version comes first", () => {
    const service = new GedcomLanguageService(
      textOf([
        "0 HEAD",
        "1 GEDC",
        "2 VERS 7.0",
        "2 VERS 5.5.1",
        "0 @I1@ INDI",
        "1 NAME a /b/",
        "2 TYPE BIRTH",
        "0 TRLR",
      ]),
    );

    expect(refused(service.moveStructure(at(3), before(2), 0)).code).toBe(
      "reading-changed",
    );
  });

  it("is refused when another declaration of a tag comes first", () => {
    const service = new GedcomLanguageService(
      textOf([
        "0 HEAD",
        "1 GEDC",
        "2 VERS 7.0",
        "1 SCHMA",
        "2 TAG _X https://example.com/x",
        "2 TAG _X https://gedcom.io/terms/v7/DATE",
        "0 @I1@ INDI",
        "1 _X nonsense",
        "0 TRLR",
      ]),
    );

    const result = refused(service.moveStructure(at(5), before(4), 0));

    expect(result.code).toBe("reading-changed");
    expect(result.diagnosticCode).toBe("VAL004");
  });

  it("is refused when a declaration that answered a diagnostic comes first", () => {
    const service = new GedcomLanguageService(
      textOf([
        "0 HEAD",
        "1 GEDC",
        "2 VERS 7.0",
        "1 SCHMA",
        "2 TAG _X https://gedcom.io/terms/v7/DATE",
        "2 TAG _X https://example.com/x",
        "0 @I1@ INDI",
        "1 _X nonsense",
        "0 TRLR",
      ]),
    );

    const result = refused(service.moveStructure(at(5), before(4), 0));

    expect(result.code).toBe("reading-changed");
    expect(result.diagnosticCode).toBe("VAL004");
  });

  it("is refused when an extension tag comes to mean another URI", () => {
    const service = new GedcomLanguageService(
      textOf([
        "0 HEAD",
        "1 GEDC",
        "2 VERS 7.0",
        "1 SCHMA",
        "2 TAG _X https://example.com/a",
        "2 TAG _X https://example.com/b",
        "0 @I1@ INDI",
        "1 _X 1 JAN 1900",
        "0 TRLR",
      ]),
    );

    const result = refused(service.moveStructure(at(5), before(4), 0));

    expect(result.code).toBe("reading-changed");
    expect(result.diagnosticCode).toBeUndefined();
  });

  it("is not refused for a header whose GEDC moves after its source", () => {
    const service = new GedcomLanguageService(
      textOf(["0 HEAD", "1 GEDC", "2 VERS 7.0", "1 SOUR app", "0 TRLR"]),
    );

    expect(accepted(service.moveStructure(at(1), END, 0)).warnings).toEqual([]);
  });
});

describe("a document read against no dialect", () => {
  it("refuses every move and its description", () => {
    const service = new GedcomLanguageService(
      textOf([
        "0 HEAD",
        "1 SYST x",
        "1 GEDC",
        "2 VERS 7.0",
        "0 @I1@ INDI",
        "1 SEX F",
        "1 NAME a /b/",
        "0 TRLR",
      ]),
    );

    expect(refused(service.moveStructure(at(6), before(5), 0)).code).toBe(
      "no-dialect",
    );
    expect(refused(service.moveStructure(at(6), END, 0)).code).toBe(
      "no-dialect",
    );
    expect(refused(service.describeMove(at(6))).code).toBe("no-dialect");
  });
});
